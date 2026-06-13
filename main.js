/* ═══════════════════════════════════════════════════════════════════════
 *  MAIN PROCESS
 *
 *  Two responsibilities:
 *   1. Serve the renderer over a custom *standard* scheme (app://) instead of
 *      file://. This is required because the renderer uses <script type="module">
 *      + an import map (to load three's ESM build and ./mood-engine.js). Module
 *      scripts are fetched with CORS, and Chromium blocks that over file://
 *      ("Cross origin requests are only supported for protocol schemes: http...").
 *      A standard, secure custom scheme is treated like an http(s) origin, so
 *      same-origin module + import-map resolution works without a bundler.
 *   2. Optionally start an AirPlay audio receiver (best-effort; the app does not
 *      depend on it for lyric sync in the known-song architecture).
 * ═══════════════════════════════════════════════════════════════════════ */
"use strict";

const { app, BrowserWindow, session, ipcMain, protocol, net } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const APP_SCHEME = "app";
const APP_HOST = "bundle";
const ROOT = __dirname; // project root is the web root served under app://bundle/

// Must be called before app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
    },
  },
]);

const APPROVED_PERMISSIONS = [
  "audioCapture",
  "mediaKeySystem",
  "media",
  "microphone",
];

function registerAppProtocol() {
  // Map app://bundle/<relpath> -> <ROOT>/<relpath>, with directory traversal
  // guarded so a crafted URL can't escape the project root.
  protocol.handle(APP_SCHEME, (request) => {
    const url = new URL(request.url);
    let relPath = decodeURIComponent(url.pathname);
    if (relPath === "/" || relPath === "") relPath = "/index.html";

    const resolved = path.normalize(path.join(ROOT, relPath));
    if (!resolved.startsWith(ROOT)) {
      return new Response("Forbidden", { status: 403 });
    }
    return net.fetch(pathToFileURL(resolved).toString());
  });
}

function createWindow() {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(APPROVED_PERMISSIONS.includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) =>
    APPROVED_PERMISSIONS.includes(permission)
  );

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#FFFFFF",
    title: "Lyric Speaker",
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(`${APP_SCHEME}://${APP_HOST}/index.html`);
}

/* ── Optional AirPlay receiver (best-effort) ───────────────────────────────
 * Registered with ipcMain.on (not .once) so the renderer can re-arm after a
 * disconnect. Wrapped so a missing/failed native module never crashes main. */
let airplayStarted = false;
ipcMain.on("start-airplay", (event) => {
  if (airplayStarted) return;
  airplayStarted = true;
  try {
    const airplayServer = require("airplay-server");
    const Speaker = require("speaker");
    const server = airplayServer();

    server.on("client", (client) => {
      event.reply("airplay-status", "Connected: " + (client.name || "device"));
      let speaker = null;

      client.on("play", () => event.reply("airplay-event", "play"));
      client.on("audio", (audioStream) => {
        if (!speaker) {
          speaker = new Speaker({ channels: 2, bitDepth: 16, sampleRate: 44100 });
          audioStream.pipe(speaker);
        }
      });
      client.on("stop", () => {
        event.reply("airplay-event", "stop");
        if (speaker) {
          try { speaker.close(); } catch (_) {}
          speaker = null;
        }
      });
    });

    server.on("error", (err) => event.reply("airplay-error", err.message));
    server.listen(5000, () => event.reply("airplay-status", "Listening on port 5000..."));
  } catch (e) {
    airplayStarted = false;
    // Native module unavailable on this platform — not fatal; the known-song
    // path needs no audio capture for lyric sync.
    event.reply("airplay-error", "AirPlay receiver unavailable: " + e.message);
  }
});

app.whenReady().then(() => {
  registerAppProtocol();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
