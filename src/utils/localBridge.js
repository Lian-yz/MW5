/**
 * 本地桥接服务客户端
 * 用于在网页端调用本地软件打开 PDF（浏览器安全限制下的解决方案）。
 * 依赖用户本地运行 public/tools/local-bridge/server.js（端口 39330）。
 */
import { isTauriRuntime } from './paperPdfStorage'

export const BRIDGE_PORT = 39330
export const BRIDGE_HOST = '127.0.0.1'

export function bridgeBase() {
  return `http://${BRIDGE_HOST}:${BRIDGE_PORT}`
}

/** 探测本地桥接服务是否在线（超时默认 800ms，避免拖慢主流程） */
export async function checkBridgeOnline(timeout = 800) {
  if (isTauriRuntime()) return false
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    const resp = await fetch(bridgeBase() + '/ping', { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!resp.ok) return false
    const data = await resp.json().catch(() => null)
    return !!(data && data.ok)
  } catch {
    return false
  }
}

/** 读取桥接服务当前保存目录（服务离线返回空串） */
export async function fetchBridgeSaveDir(timeout = 800) {
  if (isTauriRuntime()) return ''
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    const resp = await fetch(bridgeBase() + '/config', { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!resp.ok) return ''
    const data = await resp.json().catch(() => null)
    return (data && data.saveDir) || ''
  } catch {
    return ''
  }
}

/** 向桥接服务写入保存目录配置（持久化到 bridge-config.json） */
export async function saveBridgeConfig(saveDir, timeout = 2000) {  if (isTauriRuntime()) return { ok: false, error: '桌面版无需桥接' }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    const resp = await fetch(bridgeBase() + '/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveDir }),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(t)
    const data = await resp.json().catch(() => null)
    if (data && data.ok) return { ok: true, saveDir: data.saveDir }
    return { ok: false, error: (data && data.error) || ('HTTP ' + resp.status) }
  } catch (e) {
    return { ok: false, error: e.message || String(e) }
  }
}

/**
 * 通过本地桥接服务保存并打开 PDF。
 * @param {Blob|ArrayBuffer|string} blobOrUrl - Blob / ArrayBuffer / 可 fetch 的 URL
 * @param {string} fileName - 保存的文件名
 * @param {string} appPath - 自定义软件路径（可为空，使用系统默认程序）
 * @param {string} saveDir - 自定义保存目录（可为空，使用服务端配置/默认目录）
 * @returns {Promise<{ok: boolean, error?: string, file?: string, app?: string, saveDir?: string}>}
 */
export async function openPdfViaBridge(blobOrUrl, fileName, appPath = '', saveDir = '') {
  if (isTauriRuntime()) return { ok: false, error: '桌面版请使用原生打开方式' }
  try {
    let body
    if (typeof blobOrUrl === 'string') {
      const resp = await fetch(blobOrUrl)
      body = await resp.blob()
    } else if (blobOrUrl instanceof ArrayBuffer) {
      body = new Blob([blobOrUrl])
    } else {
      body = blobOrUrl
    }
    const params = new URLSearchParams()
    params.set('name', fileName)
    if (appPath) params.set('app', appPath)
    if (saveDir) params.set('saveDir', saveDir)
    const url = bridgeBase() + '/open-blob?' + params.toString()
    const resp = await fetch(url, { method: 'POST', body, cache: 'no-store' })
    const data = await resp.json().catch(() => null)
    if (data && data.ok) return { ok: true, file: data.file, app: data.app, saveDir: data.saveDir }
    return { ok: false, error: (data && data.error) || ('HTTP ' + resp.status) }
  } catch (e) {
    return { ok: false, error: e.message || String(e) }
  }
}

/**
 * 自动检测本机已安装的 PDF 阅读器（需桥接服务在线）。
 * @returns {Promise<Array<{name: string, path: string}>>}
 */
export async function findLocalApps(timeout = 6000) {
  if (isTauriRuntime()) return []
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    const resp = await fetch(bridgeBase() + '/find-apps', { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!resp.ok) return []
    const data = await resp.json().catch(() => null)
    return data && data.ok && Array.isArray(data.apps) ? data.apps : []
  } catch {
    return []
  }
}

/**
 * 校验软件路径是否有效（需桥接服务在线）。
 * @param {string} appPath - 用户填写的软件路径（支持软件名/完整路径/带引号路径）
 * @returns {Promise<{found: boolean, resolved: string}>}
 */
export async function checkLocalApp(appPath, timeout = 3000) {
  if (isTauriRuntime()) return { found: false, resolved: '' }
  const input = String(appPath || '').trim()
  if (!input) return { found: false, resolved: '' }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    const resp = await fetch(bridgeBase() + '/check-app?path=' + encodeURIComponent(input), {
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(t)
    if (!resp.ok) return { found: false, resolved: '' }
    const data = await resp.json().catch(() => null)
    if (!data || !data.ok) return { found: false, resolved: '' }
    return { found: !!data.found, resolved: data.resolved || '' }
  } catch {
    return { found: false, resolved: '' }
  }
}
