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

  mainWindow.loadURL('https://aurora-chat-server.onrender.com');

  // 🔓 AUTORISATIONS WEBRTC (Micro & Caméra)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'desktopCapture'];
    if (allowedPermissions.includes(permission)) callback(true);
    else callback(false);
  });

  // 🖥️ NOUVEAU : AUTORISATION SPÉCIALE POUR LE PARTAGE D'ÉCRAN
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // On capture l'écran principal automatiquement
      callback({ video: sources[0], audio: 'loopback' });
    }).catch(err => {
      console.log('Erreur capture écran:', err);
    });
  });

  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', function () { if (process.platform !== 'darwin') app.quit(); });