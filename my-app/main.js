// Import the necessary Electron modules
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Function to create the main application window
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

// Event: Called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Event: Recreate a window when the app is activated (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Event: Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler: Open the settings window
ipcMain.on('openSettings', () => {
  const settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'src', 'settings.html'));
});

// IPC handler: Quit the app
ipcMain.on('exit-app', () => {
  app.quit();
});

// IPC handler: Change the display mode of the currently focused window
ipcMain.on('change-display-mode', (event, mode) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    switch (mode) {
      case 'fullscreen':
        win.setFullScreen(true);
        break;
      case 'windowed':
        win.setFullScreen(false);
        win.setResizable(true);
        win.setSize(800, 600);
        break;
      case 'borderless':
        win.setFullScreen(false);
        win.setResizable(false);
        win.setSize(1920, 1080);
        win.setSimpleFullScreen(true);
        break;
    }
  }
});
