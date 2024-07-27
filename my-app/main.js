// Import the necessary Electron modules
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

const FLASK_SERVER_URL = 'http://localhost:5000';

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

ipcMain.on('start-game', async (event) => {
  try {
      const response = await axios.get(`${FLASK_SERVER_URL}/start_game`);
      event.reply('game-response', response.data);
  } catch (error) {
      console.error('Error starting game:', error);
      event.reply('game-response', {
          story: 'Error starting the game. Please try again.',
          options: ''
      });
  }
});

ipcMain.on('send-message', async (event, message) => {
  try {
      const response = await axios.post(`${FLASK_SERVER_URL}/send_message`, { message });
      event.reply('game-response', response.data);
  } catch (error) {
      console.error('Error sending message:', error);
      event.reply('game-response', {
          story: 'Error processing your message. Please try again.',
          options: ''
      });
  }
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
