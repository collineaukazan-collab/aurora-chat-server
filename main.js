const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// NOTRE MÉMOIRE : Un tableau qui va stocker l'historique des messages
let chatHistory = [];

io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté');

  // Dès qu'un utilisateur se connecte, on lui envoie l'historique des messages
  socket.emit('chat history', chatHistory);

  // Quand le serveur reçoit un nouveau message
  socket.on('chat message', (msg) => {
    // 1. On l'ajoute à la mémoire
    chatHistory.push(msg);
    // On garde seulement les 100 derniers messages pour ne pas surcharger la mémoire
    if (chatHistory.length > 100) {
      chatHistory.shift();
    }
    // 2. On le renvoie à TOUS les utilisateurs connectés
    io.emit('chat message', msg);
  });
});

// IMPORTANT POUR RENDER : process.env.PORT permet à Render de choisir le bon port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});