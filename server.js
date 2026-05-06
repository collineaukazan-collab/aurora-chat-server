const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let chatHistory = [];

io.on('connection', (socket) => {
  socket.on('user joined', (userData) => {
    socket.emit('chat history', chatHistory);
    io.emit('chat message', { 
      author: "Système", 
      text: `👋 ${userData.username} a glissé dans le serveur !`, 
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      system: true 
    });
  });

  socket.on('chat message', (msg) => {
    msg.time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    chatHistory.push(msg);
    if (chatHistory.length > 200) chatHistory.shift();
    io.emit('chat message', msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});