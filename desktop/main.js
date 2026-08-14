const { app, BrowserWindow, session, shell } = require("electron");

const APP_URL = "https://umsmessages.net";

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

  // Open external links in the user's default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Keep the window title stable
  win.on("page-title-updated", (e) => e.preventDefault());
}

app.whenReady().then(() => {
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

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
