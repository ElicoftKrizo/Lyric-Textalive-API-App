const { app, BrowserWindow, session, ipcMain } = require("electron");
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
      contextIsolation: true,
      // Required for navigator.mediaDevices.getUserMedia with loopback audio
      experimentalFeatures: true,
      // Allow loading local node_modules via require() in renderer
      nodeIntegrationInWorker: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));

  ipcMain.once('start-airplay', (event) => {
    try {
      // 1. Dual Receiver: Airplay Server Listener Backend (Node) - Native mdns removed as requested
      const Bonjour = require('bonjour-service').default;
      const bonjour = new Bonjour();

      bonjour.publish({ name: 'Lyric Speaker AirPlay', type: 'raop', port: 5000 });
      event.reply('airplay-status', 'Listening on port 5000...');

      const net = require('net');
      const server = net.createServer((socket) => {
         event.reply('airplay-status', 'Connected: iOS Device');
         event.reply('airplay-event', 'play');

         socket.on('data', (data) => {
            // Actual decoding requires native bindings which are restricted per the instructions
         });

         socket.on('end', () => {
             event.reply('airplay-event', 'stop');
         });
      });

      server.listen(5000);

    } catch(e) {
      console.error(e);
      event.reply('airplay-error', e.message);
    }
  });

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
