const { app, BrowserWindow, session } = require("electron");
const path = require("path");

function createWindow() {
  // --- Permission handler: approve audio capture and media key system silently ---
  // This must be set on the session BEFORE the window is created so that
  // getUserMedia({ audio: { mandatory: { chromeMediaSource: 'desktop' } } })
  // and any EME/MediaKeySystem requests are auto-approved without OS security popups.
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const approved = [
        "audioCapture",
        "mediaKeySystem",
        "media",
        "microphone",
        "desktopCapture",
      ];
      if (approved.includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    }
  );

  // Also handle the newer permission-check handler (Electron 14+)
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      const approved = [
        "audioCapture",
        "mediaKeySystem",
        "media",
        "microphone",
        "desktopCapture",
      ];
      return approved.includes(permission);
    }
  );

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#FFFFFF",
    title: "Lyric Speaker",
    resizable: true,
    webPreferences: {
      // nodeIntegration is off intentionally; we use contextBridge/preload pattern
      // but for this self-contained app we allow the renderer to use require via
      // the preload shim so Three.js and TextAlive work from node_modules on disk.
      nodeIntegration: false,
      contextIsolation: false,
      // Required for navigator.mediaDevices.getUserMedia with loopback audio
      experimentalFeatures: true,
      // Allow loading local node_modules via require() in renderer
      nodeIntegrationInWorker: false,
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));

  // Remove default menu bar for a clean presentation look
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
