const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Notre Base de données "En mémoire"
const usersDB = {}; // Stocke: { 'Kazan': { password: '123', avatar: '', tag: 'kazan_888' } }
const chatHistory = { 'general': [] }; // Stocke les messages par salon. ex: 'general' ou 'DM_Kazan_Xyliox'
let onlineUsers = new Set(); // Liste des gens connectés

io.on('connection', (socket) => {
  let currentUser = null;

  // 1. Système de Connexion / Inscription avec Mot de passe
  socket.on('login', ({ username, password }, callback) => {
    username = username.trim();
    
    // Si l'utilisateur n'existe pas, on le crée (Inscription)
    if (!usersDB[username]) {
      usersDB[username] = { 
        password: password, 
        avatar: '', 
        tag: username.toLowerCase() + '_' + Math.floor(1000 + Math.random() * 9000)
      };
    } 
    // S'il existe, on vérifie le mot de passe
    else if (usersDB[username].password !== password) {
      return callback({ success: false, message: 'Mot de passe incorrect !' });
    }

    // Connexion réussie
    currentUser = username;
    socket.username = username;
    onlineUsers.add(username);
    socket.join('general'); // Rejoint le serveur public par défaut

    callback({ success: true, userData: usersDB[username] });
    
    // Annonce à tout le monde qui est en ligne
    io.emit('online users', Array.from(onlineUsers));
    // Envoie l'historique du salon général
    socket.emit('chat history', { room: 'general', history: chatHistory['general'] });
  });

  // 2. Rejoindre un salon privé (MP)
  socket.on('join room', (roomID) => {
    // Quitte les autres salons privés (mais garde 'general')
    Array.from(socket.rooms).forEach(r => { if(r !== socket.id && r !== 'general') socket.leave(r); });
    
    socket.join(roomID);
    if (!chatHistory[roomID]) chatHistory[roomID] = []; // Crée l'historique si nouveau MP
    socket.emit('chat history', { room: roomID, history: chatHistory[roomID] });
  });

  // 3. Recevoir et distribuer les messages
  socket.on('chat message', (data) => {
    const room = data.room; // 'general' ou ID du MP
    const msg = {
      author: currentUser,
      avatar: usersDB[currentUser].avatar,
      text: data.text,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    if (!chatHistory[room]) chatHistory[room] = [];
    chatHistory[room].push(msg);
    if (chatHistory[room].length > 200) chatHistory[room].shift();

    io.to(room).emit('chat message', { room: room, message: msg });
  });

  // 4. Mise à jour du profil depuis les paramètres
  socket.on('update profile', (data) => {
    if(currentUser && usersDB[currentUser]) {
      if (data.avatar !== undefined) usersDB[currentUser].avatar = data.avatar;
      // On prévient les autres du changement pour rafraichir l'UI
      io.emit('online users', Array.from(onlineUsers));
    }
  });

  // 5. Déconnexion
  socket.on('disconnect', () => {
    if (currentUser) {
      onlineUsers.delete(currentUser);
      io.emit('online users', Array.from(onlineUsers));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});