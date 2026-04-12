const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  restoreMainWindow: () => ipcRenderer.invoke('restore-main-window'),
  minimizeMainWindow: () => ipcRenderer.invoke('minimize-main-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  getVersion: () => '1.0.0',
});
