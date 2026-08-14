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
    width: 420,
    height: 190,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: "UMS Messages — Downloading update",
    autoHideMenuBar: true,
  });
  const html = `
    <body style="font-family:sans-serif;background:#1a1a2e;color:#fff;display:flex;
      flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="font-size:15px;font-weight:600">Downloading update…</div>
      <div style="width:300px;height:8px;background:#333;border-radius:4px;margin-top:14px;overflow:hidden">
        <div id="bar" style="width:0%;height:100%;background:#4f8cff;border-radius:4px;transition:width .2s"></div>
      </div>
      <div id="p" style="font-size:12px;opacity:.8;margin-top:10px">Starting…</div>
      <div style="font-size:11px;opacity:.55;margin-top:6px">The installer will start automatically when done.</div>
    </body>`;
  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  return win;
}

// Stream the installer to disk with live progress (no giant memory buffer,
// no frozen-looking window on slow connections).
async function downloadWithProgress(url, dest, win) {
  const res = await net.fetch(url, { cache: "no-store" });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const file = fs.createWriteStream(dest);
  const reader = res.body.getReader();
  let received = 0;
  let lastPct = -1;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      file.write(Buffer.from(value));
      received += value.length;
      if (win && !win.isDestroyed()) {
        const pct = total ? Math.floor((received / total) * 100) : 0;
        if (pct !== lastPct) {
          lastPct = pct;
          const mb = (received / 1048576).toFixed(0);
          const totalMb = total ? (total / 1048576).toFixed(0) : "?";
          win.setProgressBar(total ? received / total : 2);
          win.webContents
            .executeJavaScript(
              `document.getElementById('bar').style.width='${pct}%';` +
                `document.getElementById('p').textContent='${pct}% — ${mb} MB of ${totalMb} MB';`
            )
            .catch(() => {});
        }
      }
    }
  } finally {
    await new Promise((resolve) => file.end(resolve));
  }
  if (total && received < total) throw new Error("Download incomplete");
}

async function runRequiredUpdate(info) {
  // The portable exe can't be replaced by the installer (users would keep
  // launching their old file forever) — send them to grab the new portable.
  const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR;
  if (isPortable) {
    dialog.showMessageBoxSync({
      type: "info",
      title: "Update required",
      message: `A new version of UMS Messages (${info.version}) is available.`,
      detail:
        "You are using the portable version. Your browser will open the downloads page — download the new portable file and replace the old one.",
      buttons: ["Open downloads page"],
      defaultId: 0,
    });
    shell.openExternal(info.page || "https://umsmessages.net/download");
    app.quit();
    return;
  }

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
  const dest = path.join(app.getPath("temp"), "UMS-Messages-Setup.exe");
  try {
    await downloadWithProgress(info.url, dest, dlWin);
    if (!dlWin.isDestroyed()) {
      dlWin.setProgressBar(-1);
      dlWin.webContents
        .executeJavaScript(`document.getElementById('p').textContent='Starting installer…';`)
        .catch(() => {});
    }
    const child = spawn(dest, [], { detached: true, stdio: "ignore" });
    child.unref();
    // Give the installer a moment to actually start before this app exits,
    // so the file replacement isn't racing a live process.
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {
    console.error("[Updater] Download failed:", e);
    dialog.showMessageBoxSync({
      type: "warning",
      title: "Update download failed",
      message: "The update could not be downloaded automatically.",
      detail: "Your browser will open the downloads page so you can install the update manually.",
      buttons: ["OK"],
    });
    shell.openExternal(info.page || info.url);
  } finally {
    if (!dlWin.isDestroyed()) dlWin.destroy();
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
