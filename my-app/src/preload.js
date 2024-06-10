const { contextBridge, ipcRenderer } = require('electron');

// middleman/communicator for closing program/exit button
contextBridge.exposeInMainWorld('electron', {
  exitApp: () => ipcRenderer.send('exit-app'),
  changeDisplayMode: (mode) => ipcRenderer.send('change-display-mode', mode)
});
