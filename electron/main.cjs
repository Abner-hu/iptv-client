const { app, BrowserWindow, Menu } = require("electron")
const { fork } = require("child_process")
const fs = require("fs")
const http = require("http")
const net = require("net")
const path = require("path")

const DEFAULT_PORT = Number(process.env.IPTV_PORT || 43217)
const DEFAULT_URL = process.env.IPTV_URL || `http://127.0.0.1:${DEFAULT_PORT}`

let serverProcess
let serverUrl = DEFAULT_URL

function htmlPage(title, body) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html><body style="margin:0;background:#0b0b0d;color:#f5f5f4;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:28rem;padding:2rem;">
    <p style="color:#f87171;letter-spacing:.3em;font-size:12px;">IPTV</p>
    <h1 style="font-size:1.5rem;margin:0 0 .75rem;">${title}</h1>
    <p style="color:#a8a29e;line-height:1.6;">${body}</p>
  </div>
</body></html>`)}`
}

function pickPort(preferred) {
  return new Promise((resolve) => {
    const probe = net.createServer()
    probe.once("error", () => {
      const any = net.createServer()
      any.listen(0, "127.0.0.1", () => {
        const { port } = any.address()
        any.close(() => resolve(port))
      })
    })
    probe.listen(preferred, "127.0.0.1", () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

function waitForHttp(url, timeoutMs) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume()
        if ((res.statusCode || 500) < 500) resolve()
        else retry()
      })
      req.on("error", retry)
      req.setTimeout(1500, () => {
        req.destroy()
        retry()
      })
    }
    const retry = () => {
      if (Date.now() - started > timeoutMs) reject(new Error("播放服务启动超时"))
      else setTimeout(attempt, 250)
    }
    attempt()
  })
}

async function startEmbeddedServer() {
  if (!app.isPackaged) return DEFAULT_URL

  const standalone = path.join(process.resourcesPath, "standalone")
  const serverJs = path.join(standalone, "server.js")
  if (!fs.existsSync(serverJs)) {
    throw new Error("安装包缺少播放服务，请重新执行 npm run dist:win")
  }

  const port = await pickPort(DEFAULT_PORT)
  serverUrl = `http://127.0.0.1:${port}`

  serverProcess = fork(serverJs, [], {
    cwd: standalone,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "ignore",
  })

  await waitForHttp(serverUrl, 45000)
  return serverUrl
}

function stopEmbeddedServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill()
    serverProcess = null
  }
}

function createWindow() {
  const icon = path.join(__dirname, "icon.ico")
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b0b0d",
    title: "IPTV Client",
    icon: fs.existsSync(icon) ? icon : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  Menu.setApplicationMenu(null)
  return win
}

app.whenReady().then(async () => {
  const win = createWindow()
  await win.loadURL(htmlPage("正在启动", "正在打开播放服务，请稍候…"))

  try {
    const url = await startEmbeddedServer()
    let failed = false
    win.webContents.on("did-fail-load", (_event, _code, _desc, loadedUrl) => {
      if (failed) return
      if (!String(loadedUrl).startsWith(url)) return
      failed = true
      void win.loadURL(htmlPage("无法打开播放器", `连不上 ${url}。请关闭后重试。`))
    })
    await win.loadURL(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await win.loadURL(htmlPage("启动失败", message))
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const next = createWindow()
      void next.loadURL(serverUrl)
    }
  })
})

app.on("before-quit", stopEmbeddedServer)
app.on("window-all-closed", () => {
  stopEmbeddedServer()
  if (process.platform !== "darwin") app.quit()
})
