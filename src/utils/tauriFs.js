/**
 * Tauri 桌面环境下的 File System Access API 兼容层
 *
 * 背景：Windows 系统 WebView2（Tauri 渲染内核）不支持浏览器 File System Access API
 * （showDirectoryPicker 等），但平台的存储层（fileStorage.js）深度依赖该 API 的句柄模型。
 *
 * 方案：在 Tauri 环境下，用 Tauri 官方 dialog/fs 插件模拟出 fileStorage.js 所需的
 * 句柄接口子集（getDirectoryHandle / getFileHandle / values / removeEntry /
 * queryPermission / requestPermission / createWritable），使上层存储代码零改动
 * 同时支持浏览器与桌面端。浏览器环境该文件不会生效（isTauriRuntime() 为 false）。
 *
 * 数据目录在桌面端的持久化：根路径存 localStorage（key 见 TAURI_ROOT_KEY）。
 */

import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, readDir, mkdir, remove, exists, stat } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'

export const TAURI_ROOT_KEY = 'tauri_storage_root_path'
export const TAURI_BACKUP_KEY = 'tauri_backup_root_path'

/** 是否运行在 Tauri（WebView2）环境中 */
export function isTauriRuntime() {
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__
}

/**
 * 获取默认数据目录（Rust 端自动创建）：
 * C:\Users\xxx\AppData\Roaming\com.mastersworkbench.app\硕士工作台数据
 * 桌面版未配置数据文件夹时自动使用该目录，数据落盘本地、不依赖浏览器缓存。
 */
export async function getDefaultDataDir() {
  try {
    return await invoke('default_data_dir')
  } catch (e) {
    console.warn('[tauriFs] getDefaultDataDir failed:', e)
    return null
  }
}

/** 拼接路径（统一使用正斜杠，Windows API 兼容） */
function joinPath(base, name) {
  if (!base) return name
  return String(base).replace(/[\\/]+$/, '') + '/' + name
}

/** 取路径的显示名（最后一段） */
function baseName(p) {
  const parts = String(p).split(/[\\/]/).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : String(p)
}

/** 兼容的 stat 结果（size + lastModified，mtime 数字/字符串双防御） */
async function fileStat(fullPath) {
  try {
    const s = await stat(fullPath)
    let m = Date.now()
    if (s.mtime !== undefined && s.mtime !== null) {
      m = typeof s.mtime === 'number' ? s.mtime : new Date(s.mtime).getTime()
      if (Number.isNaN(m)) m = Date.now()
    }
    return { size: s.size || 0, lastModified: m }
  } catch {
    return null
  }
}

/** 文件句柄兼容对象（getFile / createWritable） */
function createTauriFileHandle(dirPath, name) {
  const fullPath = joinPath(dirPath, name)
  return {
    kind: 'file',
    name,
    async getFile() {
      if (!(await exists(fullPath))) {
        const err = new Error('File not found: ' + fullPath)
        err.name = 'NotFoundError'
        throw err
      }
      const content = await readTextFile(fullPath)
      const st = await fileStat(fullPath)
      return {
        name,
        size: st ? st.size : content.length,
        lastModified: st ? st.lastModified : Date.now(),
        async text() { return content },
      }
    },
    async createWritable() {
      return createTauriWritable(fullPath)
    },
  }
}

/** createWritable 兼容对象：累积写入，close 时一次性落盘 */
function createTauriWritable(fullPath) {
  let buf = ''
  return {
    async write(data) {
      buf += typeof data === 'string' ? data : String(data)
    },
    async close() {
      const dir = fullPath.includes('/') ? fullPath.slice(0, fullPath.lastIndexOf('/')) : '.'
      await mkdir(dir, { recursive: true })
      await writeTextFile(fullPath, buf)
    },
  }
}

/** 目录句柄兼容对象（getDirectoryHandle / getFileHandle / values / removeEntry / 权限） */
function createTauriDirHandleImpl(dirPath, displayName) {
  const path = String(dirPath).replace(/[\\/]+$/, '')
  return {
    kind: 'directory',
    name: displayName || baseName(path) || path,
    _path: path,
    async getDirectoryHandle(name, opts = {}) {
      const p = joinPath(path, name)
      if (opts.create) await mkdir(p, { recursive: true })
      return createTauriDirHandleImpl(p, name)
    },
    async getFileHandle(name, opts = {}) {
      const p = joinPath(path, name)
      if (opts.create === false && !(await exists(p))) {
        const err = new Error('File not found: ' + p)
        err.name = 'NotFoundError'
        throw err
      }
      if (opts.create) await mkdir(path, { recursive: true })
      return createTauriFileHandle(path, name)
    },
    async *values() {
      let entries = []
      try { entries = await readDir(path) } catch { return }
      for (const e of entries) {
        if (e.isDirectory) yield createTauriDirHandleImpl(joinPath(path, e.name), e.name)
        else yield createTauriFileHandle(path, e.name)
      }
    },
    async removeEntry(name) {
      const p = joinPath(path, name)
      try { await remove(p, { recursive: true }) } catch {}
    },
    async queryPermission() { return 'granted' },
    async requestPermission() { return 'granted' },
  }
}

/** Tauri 原生目录选择对话框，返回绝对路径或 null（取消） */
export async function pickFolderWithTauri() {
  try {
    const dir = await open({ directory: true, multiple: false })
    return typeof dir === 'string' && dir ? dir : null
  } catch {
    return null
  }
}

/** 用根路径构造目录句柄（供 fileStorage.js 在 Tauri 环境初始化时使用） */
export function createTauriDirHandle(rootPath, displayName) {
  return createTauriDirHandleImpl(rootPath, displayName)
}
