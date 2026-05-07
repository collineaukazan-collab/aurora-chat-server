require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// 🔓 Autoriser l'application PC (CORS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static('public'));

// 🚀 ROUTE ANTI-SOMMEIL (Pour Render)
app.get('/ping', (req, res) => {
  res.status(200).send('Serveur réveillé !');
});

// 🏷️ ROUTE DE LECTURE AUTOMATIQUE DE LA VERSION
app.get('/version', (req, res) => {
  try {
    const packageJson = require('./package.json');
    res.json({ version: packageJson.version });
  } catch (err) {
    res.json({ version: 'Inconnue' });
  }
});

// ☁️ Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'aurora_avatars', allowed_formats: ['jpg', 'png', 'jpeg', 'gif'] },
});
const uploadAvatar = multer({ storage: avatarStorage });

const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'aurora_chat', allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'] },
});
const uploadChat = multer({ storage: chatStorage });

// 🗄️ Connexion Base de données
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connecté à MongoDB Atlas !'))
  .catch(err => console.log('❌ Erreur MongoDB:', err));

const UserSchema = new mongoose.Schema({
  login: { type: String, unique: true },
  password: { type: String },
  displayName: { type: String },
  avatar: { type: String, default: '' },
  bio: { type: String, default: "Salut ! J'utilise Aurora Chat." },
  status: { type: String, default: 'online' },
  themeColor: { type: String, default: '#5865F2' },
  isOnline: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
  room: { type: String }, authorId: { type: String }, authorName: { type: String },
  avatar: { type: String }, text: { type: String }, time: { type: String },
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// 📡 ROUTES D'UPLOAD
app.post('/upload-avatar', uploadAvatar.single('avatar'), (req, res) => {
  if (req.file && req.file.path) res.json({ success: true, url: req.file.path });
  else res.status(500).json({ success: false });
});

app.post('/upload-image', uploadChat.single('image'), (req, res) => {
  if (req.file && req.file.path) res.json({ success: true, url: req.file.path });
  else res.status(500).json({ success: false });
});

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

io.on('connection', (socket) => {
  let currentUserId = null;
  let currentUserDisplayName = null;

  socket.on('login', async ({ loginName, password }, callback) => {
    try {
      loginName = loginName.toLowerCase().trim();
      let user = await User.findOne({ login: loginName });

      if (!user) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ login: loginName, password: hashedPassword, displayName: loginName, isOnline: true });
        await user.save();
      } else {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return callback({ success: false, message: 'Mot de passe incorrect !' });
        user.isOnline = true;
        await user.save();
      }

      currentUserId = user._id.toString();
      currentUserDisplayName = user.displayName;
      socket.join('general');
      
      callback({ success: true, userData: { id: user._id, login: user.login, displayName: user.displayName, avatar: user.avatar, bio: user.bio, status: user.status, themeColor: user.themeColor } });

      const onlineUsers = await User.find({ isOnline: true, status: { $ne: 'invisible' } }, 'displayName avatar _id status');
      io.emit('online users', onlineUsers);
    } catch(err) {
      callback({ success: false, message: 'Erreur serveur.' });
    }
  });

  socket.on('join room', async (roomID) => {
    Array.from(socket.rooms).forEach(r => { if (r !== socket.id && r !== 'general') socket.leave(r); });
    socket.join(roomID);
    const history = await Message.find({ room: roomID }).sort({ timestamp: 1 }).limit(100);
    socket.emit('chat history', { room: roomID, history });
  });

  socket.on('chat message', async (data) => {
    const user = await User.findById(currentUserId);
    if (!user) return;
    
    const safeText = escapeHTML(data.text);
    const msg = new Message({ room: data.room, authorId: currentUserId, authorName: user.displayName, avatar: user.avatar, text: safeText, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) });
    await msg.save();
    io.to(data.room).emit('chat message', { room: data.room, message: msg });
    if(data.room !== 'general') socket.to(data.room).emit('notification', { room: data.room, fromId: currentUserId, authorName: user.displayName, text: safeText });
  });

  socket.on('typing', (room) => {
    if (currentUserDisplayName) socket.to(room).emit('typing', { name: currentUserDisplayName, room: room });
  });
  socket.on('stop typing', (room) => {
    if (currentUserDisplayName) socket.to(room).emit('stop typing', { name: currentUserDisplayName, room: room });
  });

  socket.on('update profile', async (newData, callback) => {
    const user = await User.findById(currentUserId);
    if (user) {
      if (newData.displayName) { user.displayName = newData.displayName; currentUserDisplayName = newData.displayName; }
      if (newData.avatar !== undefined) user.avatar = newData.avatar;
      if (newData.bio !== undefined) user.bio = newData.bio;
      if (newData.status) user.status = newData.status;
      if (newData.themeColor) user.themeColor = newData.themeColor;
      if (newData.password) user.password = await bcrypt.hash(newData.password, 10);
      await user.save();
      
      const onlineUsers = await User.find({ isOnline: true, status: { $ne: 'invisible' } }, 'displayName avatar _id status');
      io.emit('online users', onlineUsers);
      callback({ success: true, userData: { id: user._id, login: user.login, displayName: user.displayName, avatar: user.avatar, bio: user.bio, status: user.status, themeColor: user.themeColor } });
    }
  });

  socket.on('webrtc-offer', (data) => socket.to(data.room).emit('webrtc-offer', data));
  socket.on('webrtc-answer', (data) => socket.to(data.room).emit('webrtc-answer', data));
  socket.on('webrtc-ice-candidate', (data) => socket.to(data.room).emit('webrtc-ice-candidate', data));

  socket.on('disconnect', async () => {
    if (currentUserId) {
      await User.findByIdAndUpdate(currentUserId, { isOnline: false });
      const onlineUsers = await User.find({ isOnline: true, status: { $ne: 'invisible' } }, 'displayName avatar _id status');
      io.emit('online users', onlineUsers);
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur parfaitement en ligne sur le port ${PORT} !`);
});