const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public/favicon.ico')
  });

  // On se connecte DIRECTEMENT au serveur en ligne (Render)
  win.loadURL('https://aurora-chat-server-1.onrender.com');

  // Dès que l'application démarre, elle cherche s'il y a une mise à jour sur GitHub
  autoUpdater.checkForUpdatesAndNotify();
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

// --- ÉVÈNEMENTS DE MISE �� JOUR AUTOMATIQUE ---
autoUpdater.on('update-available', () => {
  console.log("Une mise à jour est disponible, téléchargement en cours...");
});

autoUpdater.on('update-downloaded', () => {
  // Quand la mise à jour est téléchargée, l'application redémarre toute seule pour l'installer
  autoUpdater.quitAndInstall();
});