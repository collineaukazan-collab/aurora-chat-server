const { app, BrowserWindow } = require('electron');
const path = require('path');

// On lance votre serveur en arrière-plan
require('./server.js');

function createWindow() {
  // On crée la fenêtre de l'application
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    autoHideMenuBar: true, // Cache la barre de menu Windows (Fichier, Edition...)
    icon: path.join(__dirname, 'public/favicon.ico') // Optionnel pour plus tard
  });

  // On charge le serveur local dans cette fenêtre
  win.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});