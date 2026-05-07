const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true, // 🌟 CACHE LE MENU MOCHE EN HAUT
    webPreferences: {
      nodeIntegration: true
    }
  });

  // On charge directement l'URL de Render (Ton serveur en ligne)
  mainWindow.loadURL('https://aurora-chat-server.onrender.com');

  // Vérifie les mises à jour silencieusement
  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Notifications de mise à jour
autoUpdater.on('update-available', () => {
  console.log('Mise à jour disponible !');
});
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});