const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startAirplay: () => ipcRenderer.send('start-airplay'),
  onAirplayStatus: (callback) => ipcRenderer.on('airplay-status', (_event, value) => callback(_event, value)),
  onAirplayEvent: (callback) => ipcRenderer.on('airplay-event', (_event, value) => callback(_event, value)),
  onAirplayError: (callback) => ipcRenderer.on('airplay-error', (_event, value) => callback(_event, value))
});
