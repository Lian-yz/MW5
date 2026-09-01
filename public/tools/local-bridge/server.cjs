/**
 * 硕士工作台 - 本地桥接服务
 * =========================
 * 作用：让网页端（浏览器）能够调用本地软件打开 PDF 文件。
 * 原理：浏览器出于安全限制不能直接启动本地程序，但可以访问
 *       http://127.0.0.1（本机回环地址，浏览器视为安全源）。
 *       本服务运行在本机，接收网页端传来的 PDF 二进制内容，
 *       保存到本地目录后，用你配置的软件（或系统默认程序）打开。
 *
 * 启动方式：双击「启动桥接服务.bat」，或命令行执行  node server.cjs
 * 端口：39330（可修改下方 PORT 常量）
 *
 * 保存目录优先级：接口 saveDir 参数 > 配置文件 bridge-config.json > 默认 文档/WorkbenchPDF
 * 配置文件与本文件同目录（bridge-config.json），可手动编辑，也可在平台
 * 「设置 → PDF 打开方式」中保存自定义路径（自动写入）。
 *
 * 接口：
 *   GET  /ping                      探活，返回 { ok, saveDir }
 *   GET  /config                    返回当前保存目录 { saveDir }
 *   POST /config                    保存配置 { saveDir } → 写入 bridge-config.json
 *   GET  /find-apps                 自动检测本机已安装的 PDF 阅读器，返回 [{ name, path }]
 *   GET  /check-app?path=xxx        校验软件路径是否有效，返回 { ok, found, resolved }
 *   POST /open-blob?name=xx.pdf&app=程序路径&saveDir=保存目录
 *                                   body 为 PDF 二进制，保存后用 app（或默认程序）打开
 */
'use strict'

const http = require('http')
const { spawn, execFile, execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PORT = 39330
const HOST = '127.0.0.1'

const CONFIG_FILE = path.join(__dirname, 'bridge-config.json')
const DEFAULT_SAVE_DIR = path.join(os.homedir(), 'Documents', 'WorkbenchPDF')

function loadConfig() {
  try {
    const obj = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    if (obj && typeof obj.saveDir === 'string' && obj.saveDir.trim()) return obj
  } catch (e) { /* 忽略 */ }
  return {}
}

function saveConfig(obj) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(obj, null, 2), 'utf8')
    return true
  } catch (e) { return false }
}

/** 校验保存目录：必须是绝对路径，且拒绝盘符根目录与 Windows 系统目录 */
function resolveSaveDir(dir) {
  const raw = String(dir || '').trim()
  if (!raw) return null
  if (!path.isAbsolute(raw)) return null
  const p = path.resolve(raw)
  if (p === path.parse(p).root) return null
  const winDir = (process.env.WINDIR || '').toLowerCase()
  if (winDir && p.toLowerCase().startsWith(winDir)) return null
  return p
}

let config = loadConfig()
const SAVE_DIR = resolveSaveDir(config.saveDir) || DEFAULT_SAVE_DIR
try { fs.mkdirSync(SAVE_DIR, { recursive: true }) } catch (e) { /* 忽略 */ }

function json(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req, cb) {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => cb(Buffer.concat(chunks).toString('utf8')))
  req.on('error', () => cb(null))
}

function safeName(name) {
  // 去掉路径分隔符与非法字符，防止目录穿越
  return path.basename(String(name || 'document.pdf')).replace(/[\\/:*?"<>|]/g, '_')
}

// =====================================================================
// 软件路径解析
// =====================================================================

const isWin = process.platform === 'win32'

function getProgramDirs() {
  const dirs = []
  if (process.env.ProgramFiles) dirs.push(process.env.ProgramFiles)
  if (process.env['ProgramFiles(x86)']) dirs.push(process.env['ProgramFiles(x86)'])
  const la = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  dirs.push(path.join(la, 'Programs'))
  return dirs
}

/**
 * 智能解析用户填写的软件路径。支持：
 *  - 首尾引号（从资源管理器/教程复制时常带）
 *  - %环境变量%（如 %ProgramFiles%\...）
 *  - 完整路径直接命中
 *  - 只填目录 → 尝试 <目录>\<目录名>.exe、<目录>\<目录名>\<目录名>.exe、目录下唯一 exe
 *  - 只填软件名 → PATH 查找 + 常见安装位置
 * 返回有效完整路径；找不到返回空串。
 */
function resolveAppPath(appPath) {
  let exe = String(appPath || '').trim()
  if (!exe) return ''
  // 1) 去掉首尾引号
  if ((exe.startsWith('"') && exe.endsWith('"')) || (exe.startsWith("'") && exe.endsWith("'"))) {
    exe = exe.slice(1, -1).trim()
  }
  // 2) 展开 %环境变量%
  exe = exe.replace(/%([^%]+)%/g, (m, k) => process.env[k] || m)
  // 3) 直接命中文件
  try { if (fs.existsSync(exe) && fs.statSync(exe).isFile()) return exe } catch (e) { /* 继续 */ }
  // 4) 填的是目录 → 目录内智能查找
  try {
    if (fs.existsSync(exe) && fs.statSync(exe).isDirectory()) {
      const nm = path.basename(exe)
      for (const cand of [path.join(exe, nm + '.exe'), path.join(exe, nm, nm + '.exe')]) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand
      }
      const exes = fs.readdirSync(exe).filter((f) => f.toLowerCase().endsWith('.exe'))
      if (exes.length === 1) {
        const only = path.join(exe, exes[0])
        if (fs.statSync(only).isFile()) return only
      }
      return ''
    }
  } catch (e) { return '' }
  // 5) 只有软件名（无目录分隔符）→ 常见安装位置 + PATH
  const base = path.basename(exe, path.extname(exe)).trim()
  const winBase = base + '.exe'
  if (isWin && base) {
    const tryDir = (dir) => {
      try {
        if (!fs.statSync(dir).isDirectory()) return ''
        // <目录>\<软件名>.exe
        const c1 = path.join(dir, winBase)
        if (fs.existsSync(c1) && fs.statSync(c1).isFile()) return c1
        // <目录>\<软件名>\<软件名>.exe（如 Foxit Reader\FoxitReader.exe）
        try {
          for (const sub2 of fs.readdirSync(dir)) {
            const c2 = path.join(dir, sub2, winBase)
            if (fs.existsSync(c2) && fs.statSync(c2).isFile()) return c2
          }
        } catch (e) { /* 忽略 */ }
        // 目录下唯一 exe 兜底
        const exes = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.exe'))
        if (exes.length === 1) {
          const only = path.join(dir, exes[0])
          if (fs.statSync(only).isFile()) return only
        }
      } catch (e) { /* 忽略 */ }
      return ''
    }
    for (const root of getProgramDirs()) {
      try {
        for (const sub of fs.readdirSync(root)) {
          const s = sub.toLowerCase()
          // 一级目录直接匹配（如 SumatraPDF\SumatraPDF.exe）
          if (s === base.toLowerCase() || s.includes(base.toLowerCase())) {
            const hit = tryDir(path.join(root, sub))
            if (hit) return hit
          }
        }
        // 二级目录匹配（如 Google\Chrome\chrome.exe、Foxit Software\Foxit Reader\FoxitReader.exe）
        for (const sub of fs.readdirSync(root)) {
          const dir1 = path.join(root, sub)
          if (!fs.statSync(dir1).isDirectory()) continue
          for (const sub2 of fs.readdirSync(dir1)) {
            const s2 = sub2.toLowerCase()
            if (s2 !== base.toLowerCase() && !s2.includes(base.toLowerCase())) continue
            const hit = tryDir(path.join(dir1, sub2))
            if (hit) return hit
          }
        }
      } catch (e) { /* 忽略 */ }
    }
    // PATH 查找（where 静默）
    try {
      const out = execFileSync('where', [winBase], { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      const first = String(out).split(/\r?\n/).map((s) => s.trim()).find(Boolean)
      if (first && fs.existsSync(first) && fs.statSync(first).isFile()) return first
    } catch (e) { /* 不在 PATH */ }
  }
  return ''
}

// =====================================================================
// 常见 PDF 阅读器检测（/find-apps）
// =====================================================================

/** 在给定根目录集合下递归（限深度）查找指定 exe 文件名，返回存在的路径列表 */
function findExeInRoots(roots, exeNames, maxDepth = 4) {
  const hits = []
  const names = exeNames.map((n) => n.toLowerCase())
  const walk = (dir, depth) => {
    if (depth > maxDepth || hits.length >= 10) return
    let items = []
    try { items = fs.readdirSync(dir, { withFileTypes: true }) } catch (e) { return }
    for (const it of items) {
      if (hits.length >= 10) return
      if (it.isDirectory()) walk(path.join(dir, it.name), depth + 1)
      else if (it.isFile() && names.includes(it.name.toLowerCase())) {
        hits.push(path.join(dir, it.name))
      }
    }
  }
  for (const r of roots) walk(r, 0)
  return hits
}

/** 检测本机已安装的 PDF 阅读器 */
function detectPdfApps() {
  if (!isWin) return []
  const apps = []
  const seen = new Set()
  const add = (name, p) => {
    if (!p || seen.has(p)) return
    try { if (!fs.statSync(p).isFile()) return } catch (e) { return }
    seen.add(p)
    apps.push({ name, path: p })
  }

  const pf = process.env.ProgramFiles || 'C:\\Program Files'
  const pfx = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const la = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const roots = [pf, pfx, path.join(la, 'Programs')].filter(Boolean)

  // 1) 精确预置路径
  const preset = [
    ['SumatraPDF', [path.join(pf, 'SumatraPDF', 'SumatraPDF.exe'), path.join(pfx, 'SumatraPDF', 'SumatraPDF.exe'), path.join(la, 'SumatraPDF', 'SumatraPDF.exe')]],
    ['Adobe Acrobat', [path.join(pf, 'Adobe', 'Acrobat DC', 'Acrobat', 'Acrobat.exe'), path.join(pfx, 'Adobe', 'Acrobat DC', 'Acrobat', 'Acrobat.exe'), path.join(pf, 'Adobe', 'Acrobat 2020', 'Acrobat', 'Acrobat.exe'), path.join(pfx, 'Adobe', 'Acrobat 2020', 'Acrobat', 'Acrobat.exe')]],
    ['Adobe Acrobat Reader', [path.join(pf, 'Adobe', 'Acrobat Reader DC', 'Reader', 'AcroRd32.exe'), path.join(pfx, 'Adobe', 'Acrobat Reader DC', 'Reader', 'AcroRd32.exe'), path.join(pf, 'Adobe', 'Acrobat DC', 'Reader', 'AcroRd32.exe')]],
    ['Foxit Reader', [path.join(pfx, 'Foxit Software', 'Foxit Reader', 'FoxitReader.exe'), path.join(pf, 'Foxit Software', 'Foxit Reader', 'FoxitReader.exe')]],
    ['Foxit PhantomPDF', [path.join(pfx, 'Foxit Software', 'Foxit PhantomPDF', 'FoxitPhantomPDF.exe'), path.join(pf, 'Foxit Software', 'Foxit PhantomPDF', 'FoxitPhantomPDF.exe')]],
    ['PDF-XChange Editor', [path.join(pfx, 'Tracker Software', 'PDF Editor', 'PDFXEdit.exe'), path.join(pf, 'Tracker Software', 'PDF Editor', 'PDFXEdit.exe')]],
    ['PDF-XChange Viewer', [path.join(pfx, 'Tracker Software', 'PDF Viewer', 'PDFXChangeViewer.exe'), path.join(pf, 'Tracker Software', 'PDF Viewer', 'PDFXChangeViewer.exe')]],
    ['万兴 PDFelement', [path.join(pf, 'Wondershare', 'Wondershare PDFelement', 'pdfelement.exe'), path.join(pfx, 'Wondershare', 'Wondershare PDFelement', 'pdfelement.exe')]],
    ['Microsoft Edge', [path.join(pfx, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe')]],
    ['Google Chrome', [path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(pfx, 'Google', 'Chrome', 'Application', 'chrome.exe')]],
    ['Mozilla Firefox', [path.join(pf, 'Mozilla Firefox', 'firefox.exe'), path.join(pfx, 'Mozilla Firefox', 'firefox.exe')]],
  ]
  for (const [name, paths] of preset) {
    for (const p of paths) add(name, p)
  }

  // 2) 动态目录扫描（处理版本号目录，如 WPS Office\11.1.0.xxxx\office6\wps.exe、Adobe 多版本）
  const vendorDirs = ['Adobe', 'Foxit Software', 'Tracker Software', 'Kingsoft', 'Wondershare', 'SumatraPDF', 'Mozilla Firefox']
  const targets = {
    'Adobe': ['Acrobat.exe', 'AcroRd32.exe'],
    'Foxit Software': ['FoxitReader.exe', 'FoxitPhantomPDF.exe'],
    'Tracker Software': ['PDFXEdit.exe', 'PDFXChangeViewer.exe'],
    'Kingsoft': ['wps.exe'],
    'Wondershare': ['pdfelement.exe', 'wondershare pdfelement.exe'],
    'SumatraPDF': ['SumatraPDF.exe'],
    'Mozilla Firefox': ['firefox.exe'],
  }
  for (const vendor of vendorDirs) {
    for (const root of [pf, pfx, la]) {
      const vendorPath = path.join(root, vendor)
      if (!fs.existsSync(vendorPath)) continue
      for (const exeName of targets[vendor] || []) {
        for (const p of findExeInRoots([vendorPath], [exeName], 4)) {
          add(vendor, p)
        }
      }
    }
  }

  // WPS Office 特殊：%LOCALAPPDATA%\Kingsoft\WPS Office\<ver>\office6\wps.exe
  const wpsRoot = path.join(la, 'Kingsoft', 'WPS Office')
  try {
    if (fs.existsSync(wpsRoot)) {
      for (const ver of fs.readdirSync(wpsRoot)) {
        const c = path.join(wpsRoot, ver, 'office6', 'wps.exe')
        add('WPS Office', c)
        const pdf = path.join(wpsRoot, ver, 'office6', 'wpp.exe') // 演示（不适用 PDF，跳过）
        void pdf
      }
    }
  } catch (e) { /* 忽略 */ }

  return apps
}

// =====================================================================
// 打开软件
// =====================================================================

function openWith(filePath, appPath, cb) {
  const rawApp = String(appPath || '').trim()
  if (!rawApp) {
    // 使用系统默认关联程序
    if (isWin) {
      execFile('cmd', ['/c', 'start', '', filePath], { windowsHide: true }, (err) => cb(err || null))
    } else if (process.platform === 'darwin') {
      execFile('open', [filePath], (err) => cb(err || null))
    } else {
      execFile('xdg-open', [filePath], (err) => cb(err || null))
    }
    return
  }

  const resolved = resolveAppPath(rawApp)
  if (!resolved) {
    return cb(new Error(
      '未找到软件「' + rawApp + '」。\n请在设置页点击「自动检测已装软件」一键获取，或手动填写软件完整路径（例如 C:\\Program Files\\SumatraPDF\\SumatraPDF.exe），不要只填软件名，路径前后不要带引号。'
    ))
  }

  // 快捷方式 .lnk 无法被 spawn 直接启动，交给 cmd start
  if (resolved.toLowerCase().endsWith('.lnk')) {
    execFile('cmd', ['/c', 'start', '', resolved], { windowsHide: true }, (err) => cb(err || null))
    return
  }

  const child = spawn(resolved, [filePath], { detached: true, stdio: 'ignore' })
  child.on('error', (err) => cb(err))
  child.unref()
  return cb(null)
}

// =====================================================================
// HTTP 服务
// =====================================================================

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + HOST + ':' + PORT)

  // 跨域预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    })
    return res.end()
  }

  // 探活
  if (req.method === 'GET' && url.pathname === '/ping') {
    return json(res, 200, { ok: true, name: 'master-workbench-bridge', saveDir: SAVE_DIR })
  }

  // 读取 / 写入配置
  if (url.pathname === '/config') {
    if (req.method === 'GET') {
      return json(res, 200, { ok: true, saveDir: SAVE_DIR })
    }
    if (req.method === 'POST') {
      return readBody(req, (body) => {
        try {
          const obj = JSON.parse(body || '{}')
          const dir = resolveSaveDir(obj.saveDir)
          if (!dir) return json(res, 400, { ok: false, error: '无效的保存目录，需为绝对路径（如 D:\\Papers\\PDF）' })
          config = { saveDir: dir }
          if (!saveConfig(config)) return json(res, 500, { ok: false, error: '写入配置文件失败' })
          try { fs.mkdirSync(dir, { recursive: true }) } catch (e) { /* 忽略 */ }
          return json(res, 200, { ok: true, saveDir: dir })
        } catch (e) {
          return json(res, 400, { ok: false, error: '配置格式错误' })
        }
      })
    }
  }

  // 自动检测已安装的 PDF 阅读器
  if (req.method === 'GET' && url.pathname === '/find-apps') {
    const apps = detectPdfApps()
    return json(res, 200, { ok: true, apps })
  }

  // 校验软件路径
  if (req.method === 'GET' && url.pathname === '/check-app') {
    const input = (url.searchParams.get('path') || '').trim()
    if (!input) return json(res, 200, { ok: true, found: false, resolved: '' })
    const resolved = resolveAppPath(input)
    return json(res, 200, { ok: true, found: !!resolved, resolved, input })
  }

  // 保存并打开 PDF
  if (req.method === 'POST' && url.pathname === '/open-blob') {
    const name = safeName(url.searchParams.get('name') || 'document.pdf')
    const app = (url.searchParams.get('app') || '').trim()
    const saveDir = resolveSaveDir(url.searchParams.get('saveDir')) || resolveSaveDir(config.saveDir) || DEFAULT_SAVE_DIR
    try { fs.mkdirSync(saveDir, { recursive: true }) } catch (e) { /* 忽略 */ }
    const target = path.join(saveDir, name)
    const chunks = []
    let size = 0
    req.on('data', (c) => { chunks.push(c); size += c.length })
    req.on('end', () => {
      try {
        fs.writeFileSync(target, Buffer.concat(chunks))
      } catch (e) {
        return json(res, 500, { ok: false, error: '写入失败: ' + e.message })
      }
      openWith(target, app, (err) => {
        if (err) return json(res, 500, { ok: false, error: err.message })
        json(res, 200, { ok: true, file: target, app: app || '系统默认', saveDir })
      })
    })
    req.on('error', () => json(res, 400, { ok: false, error: '接收数据失败' }))
    return
  }

  json(res, 404, { ok: false, error: '接口不存在' })
})

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log('========================================')
    console.log('硕士工作台 · 本地桥接服务已启动')
    console.log('地址: http://' + HOST + ':' + PORT)
    console.log('PDF 保存目录: ' + SAVE_DIR)
    console.log('（如需自定义目录：在平台设置页保存，或编辑本目录 bridge-config.json）')
    console.log('本窗口可最小化，请勿关闭；关闭后网页将无法调用本地软件')
    console.log('========================================')
  })
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error('端口 ' + PORT + ' 已被占用，服务可能已在运行，或请修改 PORT 常量后重试。')
    } else {
      console.error('启动失败: ' + e.message)
    }
    process.exit(1)
  })
}

module.exports = { resolveAppPath, detectPdfApps, openWith }
