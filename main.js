const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true, // Cache le menu Windows moche
    icon: path.join(__dirname, 'icon.png'), // 🌟 CHARGE TON LOGO HD ICI
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL('https://aurora-chat-server.onrender.com');
  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});