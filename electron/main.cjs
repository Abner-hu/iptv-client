const { app, BrowserWindow, Menu } = require("electron")

const START_URL = process.env.IPTV_URL || "http://127.0.0.1:43217"

function fallbackHtml() {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html><body style="margin:0;background:#0b0b0d;color:#f5f5f4;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:28rem;padding:2rem;">
    <p style="color:#f87171;letter-spacing:.3em;font-size:12px;">IPTV</p>
    <h1 style="font-size:1.5rem;">终端尚未连上播放服务</h1>
    <p style="color:#a8a29e;line-height:1.6;">请先在本机运行 <code style="color:#fde68a;">npm run start</code>，再打开此窗口。默认地址 ${START_URL}</p>
  </div>
</body></html>`)}`
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b0b0d",
    title: "IPTV 终端",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  Menu.setApplicationMenu(null)
  let failed = false
  win.webContents.on("did-fail-load", (_event, _code, _desc, url) => {
    if (failed) return
    if (!url.startsWith(START_URL)) return
    failed = true
    win.loadURL(fallbackHtml())
  })
  win.loadURL(START_URL)
}

app.whenReady().then(() => {
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
