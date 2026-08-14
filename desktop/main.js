const { app, BrowserWindow, session, shell, dialog, net } = require("electron");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const APP_URL = "https://umsmessages.net";
const VERSION_URL = "https://umsmessages.net/desktop-version.json";

function compareVersions(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

async function checkForRequiredUpdate() {
  try {
    const res = await net.fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const info = await res.json();
    if (info && info.version && compareVersions(info.version, app.getVersion()) > 0) {
      return info;
    }
  } catch (e) {
    // Offline or the check failed — don't lock the user out.
    console.warn("[Updater] Version check failed:", e);
  }
  return null;
}

function showDownloadingWindow() {
  const win = new BrowserWindow({
    width: 380,
    height: 150,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "UMS Messages",
    autoHideMenuBar: true,
  });
  const html = `
    <body style="font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;
      flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="font-size:15px;font-weight:600">Downloading update…</div>
      <div style="font-size:12px;opacity:.7;margin-top:6px">The installer will start automatically.</div>
    </body>`;
  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  return win;
}

async function runRequiredUpdate(info) {
  const choice = dialog.showMessageBoxSync({
    type: "info",
    title: "Update required",
    message: `A new version of UMS Messages (${info.version}) is available.`,
    detail: "You need to update before you can continue using the app. Click Update to install the latest version.",
    buttons: ["Update", "Quit"],
    defaultId: 0,
    cancelId: 1,
  });

  if (choice !== 0) {
    app.quit();
    return;
  }

  const dlWin = showDownloadingWindow();
  try {
    const res = await net.fetch(info.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const dest = path.join(app.getPath("temp"), "UMS-Messages-Setup.exe");
    fs.writeFileSync(dest, buf);
    spawn(dest, [], { detached: true, stdio: "ignore" }).unref();
  } catch (e) {
    console.error("[Updater] Download failed:", e);
    // Fall back to the downloads page in the browser
    shell.openExternal(info.page || info.url);
  } finally {
    dlWin.destroy();
    app.quit();
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 480,
    minHeight: 600,
    title: "UMS Messages",
    autoHideMenuBar: true,
    backgroundColor: "#1a1a2e",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(APP_URL);

  // Open external links in the user's default browser (web links only —
  // never file:, custom protocols, etc.)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      if (url.startsWith("https://") || url.startsWith("http://")) {
        shell.openExternal(url);
      }
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Keep the window title stable
  win.on("page-title-updated", (e) => e.preventDefault());
}

app.whenReady().then(async () => {
  // Allow camera/microphone (video calls), notifications, etc.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    const allowed = [
      "media",
      "notifications",
      "fullscreen",
      "clipboard-read",
      "clipboard-sanitized-write",
      "display-capture",
      "pointerLock",
    ];
    callback(allowed.includes(permission));
  });

  // Mandatory update gate: if a newer desktop version is published,
  // the app can't be used until it's installed.
  const update = await checkForRequiredUpdate();
  if (update) {
    await runRequiredUpdate(update);
    return;
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
