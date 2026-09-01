/**
 * Electron 主进程 — 研究生工作台桌面版
 *
 * 混合模式：exe 壳 + 云端页面
 * - 页面内容从 CloudStudio 加载，更新代码 = 云端重新部署
 * - Electron 提供原生能力：文件夹选择、本地文件读写
 */

const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// 云端页面地址
const CLOUD_URL = 'https://c99f925959c74ddaa1594985e09b3d86.app.codebuddy.work'

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '研究生工作台',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.loadURL(CLOUD_URL)

  // 外部链接用系统默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ===================== IPC 处理 =====================

// 选择文件夹 — 对应 window.showDirectoryPicker
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择数据存储文件夹',
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// 读取文件
ipcMain.handle('read-file', async (_event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { ok: true, content }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// 写入文件
ipcMain.handle('write-file', async (_event, filePath, content) => {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// 列出目录文件（用于 fileReadAll）
ipcMain.handle('list-dir', async (_event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) return { ok: true, files: [] }
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const files = entries
      .filter(e => e.isFile())
      .map(e => {
        const fp = path.join(dirPath, e.name)
        const stat = fs.statSync(fp)
        return {
          name: e.name,
          size: stat.size,
          lastModified: stat.mtimeMs,
        }
      })
    return { ok: true, files }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// 删除文件
ipcMain.handle('remove-file', async (_event, filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// 确保目录存在
ipcMain.handle('ensure-dir', async (_event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// 获取文件信息
ipcMain.handle('file-info', async (_event, filePath) => {
  try {
    const stat = fs.statSync(filePath)
    return { ok: true, size: stat.size, lastModified: stat.mtimeMs, exists: true }
  } catch {
    return { ok: true, exists: false }
  }
})

// 复制文件
ipcMain.handle('copy-file', async (_event, src, dest) => {
  try {
    const destDir = path.dirname(dest)
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })
    fs.copyFileSync(src, dest)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ===================== 应用生命周期 =====================

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
