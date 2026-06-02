const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startAirplay: () => ipcRenderer.send('start-airplay'),
  onAirplayStatus: (callback) => ipcRenderer.on('airplay-status', callback),
  onAirplayEvent: (callback) => ipcRenderer.on('airplay-event', callback),
  onAirplayError: (callback) => ipcRenderer.on('airplay-error', callback)
});

// Polyfill window.require gracefully to satisfy Textalive module inclusion without compromising security
window.require = function() { return null; };
