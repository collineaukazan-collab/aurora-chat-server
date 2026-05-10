const { app, BrowserWindow, session, desktopCapturer } = require('electron');
const path = require('path');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Charge ton serveur distant
  mainWindow.loadURL('https://aurora-chat-server.onrender.com');

  // 🔓 AUTORISATIONS OBLIGATOIRES POUR WEBRTC (MICRO, CAMÉRA, ÉCRAN)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'desktopCapture'];
    if (allowedPermissions.includes(permission)) {
      callback(true); // Autorise la caméra, le micro et l'écran
    } else {
      callback(false);
    }
  });

  // Cache le menu du haut par défaut
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});