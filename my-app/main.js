const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');

function createWindow() {  // function that creates a new browser window as well as loads its according html file
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false, //borderless window
    fullscreen: true, //fullscreen mode
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {  // executes when electron is done initializing/loading
  createWindow();

  app.on('activate', () => { // for macOS || Used to recreate a window when the dock icon is clicked and there arent any other windows open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { // quits the application when all windows are closed, except on macOS (refer to the app.on('activate') function for fix)
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('openSettings', (event) => {
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

//ipc communicator to close program/exit button
ipcMain.on('exit-app', () => {
  app.quit();
});
