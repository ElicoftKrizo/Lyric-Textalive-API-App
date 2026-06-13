/* ═══════════════════════════════════════════════════════════════════════
 *  PRELOAD
 *
 *  Runs in an isolated context (contextIsolation: true) and is the ONLY bridge
 *  between the renderer and the main process. The renderer must never call
 *  require('electron') directly — with contextIsolation + nodeIntegration:false
 *  that throws. Everything it needs is exposed on window.lyricSpeaker below.
 *
 *  Note: IpcRendererEvent objects cannot be cloned across the contextBridge,
 *  so each listener is wrapped to forward only the payload value (the original
 *  code forwarded the raw event as the first callback arg, which was stripped).
 * ═══════════════════════════════════════════════════════════════════════ */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lyricSpeaker", {
  // Fire-and-forget: ask main to (optionally) start the AirPlay receiver.
  startAirplay: () => ipcRenderer.send("start-airplay"),

  // Event subscriptions. Each returns an unsubscribe function.
  onAirplayStatus: (cb) => {
    const h = (_e, value) => cb(value);
    ipcRenderer.on("airplay-status", h);
    return () => ipcRenderer.removeListener("airplay-status", h);
  },
  onAirplayEvent: (cb) => {
    const h = (_e, value) => cb(value);
    ipcRenderer.on("airplay-event", h);
    return () => ipcRenderer.removeListener("airplay-event", h);
  },
  onAirplayError: (cb) => {
    const h = (_e, value) => cb(value);
    ipcRenderer.on("airplay-error", h);
    return () => ipcRenderer.removeListener("airplay-error", h);
  },
});
