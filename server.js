const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let chatHistory = [];

io.on('connection', (socket) => {
  // Quand l'utilisateur a rentré son pseudo
  socket.on('user joined', (username) => {
    // 1. On lui envoie l'historique
    socket.emit('chat history', chatHistory);
    // 2. On annonce son arrivée
    io.emit('chat message', { 
      author: "Système", 
      text: `👋 ${username} a rejoint le salon !`, 
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      system: true 
    });
  });

  socket.on('chat message', (msg) => {
    // On ajoute l'heure au message
    msg.time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    chatHistory.push(msg);
    if (chatHistory.length > 200) chatHistory.shift(); // Garde les 200 derniers
    
    io.emit('chat message', msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});