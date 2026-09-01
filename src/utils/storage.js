/**
 * 存储层封装 — 支持双模式
 *
 * 模式 1（默认）：浏览器 localStorage
 * 模式 2（推荐）：本地硬盘文件夹（File System Access API）+ localStorage 镜像
 *
 * save() 始终写入 localStorage（保证同步读取可用），同时异步写入本地文件夹。
 * 首次激活文件存储时自动将 localStorage 数据迁移到本地文件夹。
 */

import { isFileStorageActive as _fsIsActive, fileWrite as _fsWrite, fileWriteAll as _fsWriteAll, fileReadAll as _fsReadAll, fileWriteRaw as _fsWriteRaw, isBackupActive as _fsBackupActive, writeAutoBackup as _fsWriteBackup, writeMainBackup as _fsWriteMainBackup, listMainBackups as _fsListMainBackups, readMainBackup as _fsReadMainBackup, deleteMainBackup as _fsDeleteMainBackup } from './fileStorage'
import { isFileSystemAccessSupported as _efsSupported, isFileStorageActive as _efsIsActive, fileWrite as _efsWrite, fileWriteAll as _efsWriteAll, fileReadAll as _efsReadAll, isBackupActive as _efsBackupActive, writeAutoBackup as _efsWriteBackup, selectStorageFolder as _efsSelectFolder } from './electronFileStorage'
import { idbGet, idbSet, idbRemove, idbClear, idbExportAll } from './indexedDb'

/** 检测是否 Electron 环境 */
function isElectron() {
  return !!(window.electronAPI && window.electronAPI.isElectron)
}

/** 统一检测文件存储是否激活 */
export function isFileStorageActive() {
  if (isElectron()) return _efsIsActive()
  return _fsIsActive()
}function isBackupActive() {
  if (isElectron()) return _efsBackupActive()
  return _fsBackupActive()
}

const PREFIX = 'mw_' // master workbench

// ========== 同步读写（localStorage） ==========

export function load(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    // 防御：'null' / 'undefined' / 空串 视为损坏数据，返回默认值（防止 null 污染 store 状态）
    if (raw === null || raw === 'null' || raw === 'undefined' || raw.trim() === '') return defaultValue
    return JSON.parse(raw)
  } catch (e) {
    console.warn(`[storage] Failed to load "${key}":`, e)
    return defaultValue
  }
}

export function saveSync(key, value) {
  // 防御：拒绝写入 null / undefined，防止把 mw_<key> 写成 'null' 导致数据被污染丢失
  if (value === null || value === undefined) {
    console.warn(`[storage] 拒绝写入 "${key}"：值为 ${value}，已阻止污染 localStorage`)
    return false
  }
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch (e) {
    console.warn(`[storage] Failed to save "${key}":`, e)
    if (e.name === 'QuotaExceededError' || e.toString().includes('quota')) {
      alert(`浏览器存储空间不足！\n\n无法保存「${key}」数据。\n\n建议操作：\n1. 进入平台设置 → 导出 JSON 备份后清除旧数据\n2. 或清理浏览器缓存`)
    }
    return false
  }
}

// 保存回调列表
const saveListeners = []

export function onSave(fn) {
  saveListeners.push(fn)
}

export function offSave(fn) {
  const idx = saveListeners.indexOf(fn)
  if (idx >= 0) saveListeners.splice(idx, 1)
}

function notifyCallbacks(key, value) {
  for (const fn of saveListeners) {
    try { fn(key, value) } catch {}
  }
}

// ========== 自动备份防抖控制 ==========
let autoBackupTimer = null
const AUTO_BACKUP_DEBOUNCE_MS = 3000

/** 读取用户是否开启自动备份（默认开启） */
export function isAutoBackupEnabled() {
  return load('autoBackupEnabled', true)
}

/** 设置自动备份开关 */
export function setAutoBackupEnabled(enabled) {
  saveSync('autoBackupEnabled', !!enabled)
}

/** 记录最近一次自动备份成功的时间戳 */
function recordAutoBackupTime() {
  saveSync('lastAutoBackupAt', Date.now())
}

/** 读取最近一次自动备份时间戳 */
export function getLastAutoBackupAt() {
  return load('lastAutoBackupAt', 0)
}

/**
 * 保存数据 — 写入 localStorage 并异步写入本地文件夹 + IndexedDB（PWA 大容量镜像）
 */
export function save(key, value) {
  const ok = saveSync(key, value)
  if (ok) notifyCallbacks(key, value)

  // 异步镜像到 IndexedDB（主存储兜底，突破 localStorage 5MB 限制）
  idbSet(PREFIX + key, JSON.stringify(value)).catch(e => {
    console.warn(`[storage] IndexedDB write failed for "${key}":`, e)
  })

  // 异步写入本地文件夹（主存储，即时落盘，电脑关机不丢）
  if (isFileStorageActive()) {
    const writeFn = isElectron() ? _efsWrite : _fsWrite
    writeFn(key, value).catch(e => {
      console.warn(`[storage] File write failed for "${key}":`, e)
    })
  }

  // 自动备份到主文件夹 backups/（或兼容旧独立备份文件夹）
  // 用户可关闭；默认开启；3 秒防抖，避免连续操作产生大量备份
  // 执行时让出主线程（requestIdleCallback），避免后台恢复瞬间抢占 UI
  if ((isFileStorageActive() || isBackupActive()) && isAutoBackupEnabled()) {
    if (autoBackupTimer) clearTimeout(autoBackupTimer)
    autoBackupTimer = setTimeout(() => {
      autoBackupTimer = null
      const runBackup = () => {
        backupNow('auto').then(ok => {
          if (ok) recordAutoBackupTime()
        }).catch(e => {
          console.warn('[storage] Auto-backup failed:', e)
        })
      }
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => runBackup(), { timeout: 2000 })
      } else {
        setTimeout(runBackup, 50)
      }
    }, AUTO_BACKUP_DEBOUNCE_MS)
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
  idbRemove(PREFIX + key).catch(() => {})
}

export function clearAll() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k))
  idbClear().catch(() => {})
}

export function exportAll() {
  const data = {}
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => {
      const key = k.slice(PREFIX.length)
      try { data[key] = JSON.parse(localStorage.getItem(k)) } catch { data[key] = null }
    })
  return data
}

/**
 * 导出全部数据（原始格式，与「导出 JSON」功能一致）
 * 键带 mw_ 前缀，值为 localStorage 原始序列化字符串
 * 用于自动备份文件写入，保证备份可直接被导入恢复
 */
export function exportAllRaw() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) {
      data[key] = localStorage.getItem(key)
    }
  }
  return data
}

// ========== 文件存储集成 ==========

/**
 * 将 localStorage 所有数据迁移到本地文件夹
 */
export async function migrateToFileStorage() {
  const allData = {}
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => {
      const key = k.slice(PREFIX.length)
      try { allData[key] = JSON.parse(localStorage.getItem(k)) } catch {}
    })
  const writeAllFn = isElectron() ? _efsWriteAll : _fsWriteAll
  await writeAllFn(allData)
  return Object.keys(allData).length
}

/**
 * 从本地文件夹加载数据到 localStorage（合并式，杜绝数据丢失）
 *
 * 安全规则：
 * - 仅当 localStorage 中该键缺失（或为 null）时才从文件恢复；
 * - 本地已存在的数据一律保留，绝不用旧文件覆盖新数据；
 * - 若本地为「空数组/空对象」且文件中有非空数据，则从文件恢复（用于换设备恢复场景）。
 *
 * 用于切换/恢复存储文件夹后同步数据。
 */
export async function syncFromFileStorage() {
  const readAllFn = isElectron() ? _efsReadAll : _fsReadAll
  const fileData = await readAllFn()
  let count = 0
  for (const [key, value] of Object.entries(fileData)) {
    if (value == null) continue
    const existing = localStorage.getItem(PREFIX + key)
    let shouldPull = existing === null || existing === 'null'
    if (!shouldPull && existing !== undefined) {
      // 本地为空但文件非空 → 恢复（换设备/清缓存后重连场景）
      try {
        const parsed = JSON.parse(existing)
        const localEmpty = (Array.isArray(parsed) && parsed.length === 0) ||
          (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === 0)
        if (localEmpty) {
          let fileVal = value
          if (typeof fileVal === 'string') {
            try { fileVal = JSON.parse(fileVal) } catch { fileVal = null }
          }
          const fileEmpty = fileVal === null || (Array.isArray(fileVal) && fileVal.length === 0) ||
            (typeof fileVal === 'object' && !Array.isArray(fileVal) && Object.keys(fileVal).length === 0)
          shouldPull = !fileEmpty
        }
      } catch { shouldPull = false }
    }
    if (shouldPull) {
      saveSync(key, value)
      notifyCallbacks(key, value)
      count++
    }
  }
  return count
}

// ========== 统一备份封装（v3 单文件夹方案） ==========

/** 计算一个值的"数据量"分数：数组看长度，对象看键数，其他看字符数 */
function dataScore(v) {
  if (v === null || v === undefined) return 0
  if (Array.isArray(v)) return v.length
  if (typeof v === 'object') return Object.keys(v).length
  return String(v).length
}

/** 尝试解析字符串为 JSON，失败返回 null */
function safeParse(s) {
  if (typeof s !== 'string') return s
  try { return JSON.parse(s) } catch { return null }
}

/**
 * 立即执行一次全量备份
 * 浏览器：优先写主文件夹 backups/（单文件夹方案），未绑定主文件夹时兼容旧独立备份文件夹；
 * Electron：写旧独立备份文件夹（EXE 已停更，保持原行为）。
 * @param {string} kind 'auto' | 'snapshot' | 'manual'
 * @param {string} label 快照说明（snapshot 类型使用）
 */
export async function backupNow(kind = 'auto', label = '') {
  const allData = exportAllRaw()
  if (isElectron()) {
    if (_efsBackupActive()) return _efsWriteBackup(allData)
    return false
  }
  if (_fsIsActive()) return _fsWriteMainBackup(allData, kind, label)
  if (_fsBackupActive()) return _fsWriteBackup(allData)
  return false
}

/** 升级 / 导入前自动快照备份 */
export async function writeSnapshotBackup(label) {
  return backupNow('snapshot', label)
}

/** 手动备份一次 */
export async function writeManualBackup() {
  return backupNow('manual')
}

/** 列出全部备份文件（浏览器：主文件夹 backups/；Electron：暂不支持返回空数组） */
export async function listBackupFiles() {
  if (isElectron()) return []
  if (!_fsIsActive()) return []
  return _fsListMainBackups()
}

/** 读取指定备份文件内容 */
export async function readBackupFile(name) {
  if (isElectron()) return null
  if (!_fsIsActive()) return null
  return _fsReadMainBackup(name)
}

/** 删除指定备份文件 */
export async function deleteBackupFile(name) {
  if (isElectron()) return false
  if (!_fsIsActive()) return false
  return _fsDeleteMainBackup(name)
}

/** 恢复指定备份到 localStorage 与本地文件（合并式，不删除备份中不存在的当前模块） */
export async function restoreBackupFile(name) {
  const backup = await readBackupFile(name)
  if (!backup || !backup.data || typeof backup.data !== 'object') {
    return { ok: false, reason: '无法读取备份文件或备份内容无效' }
  }
  let count = 0
  const modules = []
  for (const [key, value] of Object.entries(backup.data)) {
    if (value === null || value === undefined || value === '') continue
    const finalKey = key.startsWith(PREFIX) ? key : PREFIX + key
    let stored
    if (typeof value === 'string') {
      try { JSON.parse(value); stored = value } catch { stored = JSON.stringify(value) }
    } else {
      stored = JSON.stringify(value)
    }
    try {
      localStorage.setItem(finalKey, stored)
      modules.push(finalKey.slice(PREFIX.length))
      count++
    } catch {}
  }
  if (isFileStorageActive()) {
    try { await migrateToFileStorage() } catch {}
  }
  // 同步 IndexedDB 镜像，保证大容量存储一致性
  reconcileWithIndexedDB().catch(() => {})
  return { ok: true, count, modules }
}

/**
 * 启动智能合并：本地文件夹（主存储）与浏览器缓存（渲染缓存）双向取更全的一侧。
 * 任何一侧损坏 / 清空都不会拖累另一侧，杜绝数据丢失。
 *
 * 注意：auth 相关键（authLoggedIn / authUsername / authLoginAt）不参与合并，
 * 因为它们是会话级状态，dataScore 比较无意义，且文件异步写入可能导致拉回旧值 → 刷新死循环。
 * @returns {Promise<{pulled: number, pushed: number}>}
 */
const RECONCILE_SKIP_KEYS = new Set(['authLoggedIn', 'authUsername', 'authLoginAt'])
export async function reconcileWithFileStorage() {
  const readAllFn = isElectron() ? _efsReadAll : _fsReadAll
  const fileData = await readAllFn()
  let pulled = 0
  let pushed = 0
  for (const [key, value] of Object.entries(fileData)) {
    if (value == null) continue
    if (RECONCILE_SKIP_KEYS.has(key)) continue
    const finalKey = PREFIX + key
    const raw = localStorage.getItem(finalKey)
    let cached = null
    let cachedOk = false
    if (raw !== null && raw !== 'null' && raw !== 'undefined' && raw.trim() !== '') {
      const parsed = safeParse(raw)
      if (parsed !== null) { cached = parsed; cachedOk = true }
    }
    const fileVal = typeof value === 'string' ? (safeParse(value) ?? value) : value
    if (!cachedOk) {
      // 缓存缺失/损坏 → 以文件为准（恢复场景）
      localStorage.setItem(finalKey, typeof value === 'string' ? value : JSON.stringify(value))
      pulled++
    } else if (dataScore(fileVal) > dataScore(cached)) {
      // 文件更全 → 回灌缓存
      localStorage.setItem(finalKey, typeof value === 'string' ? value : JSON.stringify(value))
      pulled++
    } else if (dataScore(cached) > dataScore(fileVal)) {
      // 缓存更全 → 写回文件（防文件被旧数据覆盖）
      const writeFn = isElectron() ? _efsWrite : _fsWrite
      writeFn(key, cached).then(() => { pushed++ }).catch(() => {})
    }
  }
  return { pulled, pushed }
}

// ========== IndexedDB 大容量存储（PWA） ==========

/**
 * 启动时合并 IndexedDB（PWA 大容量主存储）与 localStorage（快速渲染缓存）。
 * 取「更全的一侧」，任何一侧损坏 / 清空都不会拖累另一侧。
 *
 * 场景：
 * - localStorage 超 5MB 写不进 → IndexedDB 兜住全部数据 → 下次启动回灌恢复
 * - 用户清浏览器缓存 → IndexedDB 数据仍在 → 自动恢复，无需手动导入
 * - 正常双写场景 → 两侧一致，无操作
 *
 * @returns {Promise<{migrated: number, restored: number}>}
 */
export async function reconcileWithIndexedDB() {
  try {
    const idbData = await idbExportAll()
    const idbKeys = new Set(Object.keys(idbData))
    let migrated = 0
    let restored = 0

    // 1) localStorage 有、IndexedDB 缺失或更旧 → 迁入 IndexedDB
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      const raw = localStorage.getItem(k)
      if (raw === null || raw === 'null' || raw === 'undefined' || raw.trim() === '') continue
      const localVal = safeParse(raw)
      if (localVal === null) continue
      const idbVal = idbKeys.has(k) ? safeParse(idbData[k]) : null
      if (idbVal === null) {
        await idbSet(k, raw)
        migrated++
      } else if (dataScore(localVal) > dataScore(idbVal)) {
        await idbSet(k, raw)
        migrated++
      }
    }

    // 2) IndexedDB 有、localStorage 缺失/损坏/更旧 → 回灌 localStorage
    for (const [k, v] of Object.entries(idbData)) {
      if (v == null) continue
      const idbVal = typeof v === 'string' ? (safeParse(v) ?? v) : v
      if (idbVal === null) continue
      const raw = localStorage.getItem(k)
      let localOk = false
      let localVal = null
      if (raw !== null && raw !== 'null' && raw !== 'undefined' && raw.trim() !== '') {
        localVal = safeParse(raw)
        localOk = localVal !== null
      }
      if (!localOk) {
        saveSync(k.slice(PREFIX.length), typeof v === 'string' ? (safeParse(v) ?? v) : v)
        restored++
      } else if (dataScore(idbVal) > dataScore(localVal)) {
        saveSync(k.slice(PREFIX.length), idbVal)
        restored++
      }
    }
    return { migrated, restored }
  } catch (e) {
    console.warn('[storage] reconcileWithIndexedDB failed:', e)
    return { migrated: 0, restored: 0 }
  }
}

/**
 * PWA 存储初始化（main.js 挂载前调用）
 * 合并 IndexedDB 与 localStorage，确保数据完整后应用再启动
 */
export async function initIndexedDBStorage() {
  return reconcileWithIndexedDB()
}

/** 格式化字节大小（UI 展示用） */
export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

// 暴露 Electron 原生文件夹选择供 Settings.vue 使用
export function getElectronSelectFolder() {
  return _efsSelectFolder
}

// ========== 工具函数 ==========

/**
 * 压缩图片为指定尺寸/质量的 base64 dataURL
 * - 限制最大宽度/高度 256px，保持比例
 * - 输出 JPEG 0.8，透明图片会转白底
 * - 失败时返回原 dataURL
 */
export function compressImage(dataURL, options = {}) {
  const { maxSize = 256, quality = 0.8, type = 'image/jpeg' } = options
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataURL)
      // JPEG 无透明，先铺白底避免黑底
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      try {
        resolve(canvas.toDataURL(type, quality))
      } catch {
        resolve(dataURL)
      }
    }
    img.onerror = () => resolve(dataURL)
    img.src = dataURL
  })
}

/**
 * 保存文本文件 — 双环境兼容
 * - 桌面端（pywebview / EXE）：调用原生「另存为」对话框保存到磁盘
 * - 浏览器：回退为 <a download> 触发下载
 * @returns {Promise<string|null>} 保存成功返回文件路径（浏览器环境返回 null）
 */
export async function saveTextToFile(filename, content, mime = 'application/octet-stream') {
  // 桌面端：pywebview 注入的原生保存通道
  if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.saveTextFile === 'function') {
    try {
      const result = await window.pywebview.api.saveTextFile(filename, content)
      if (typeof result === 'string' && result) {
        if (result.startsWith('ERROR:')) {
          console.warn('[saveTextToFile] 桌面端保存失败:', result)
        } else {
          return result
        }
      }
    } catch (e) {
      console.warn('[saveTextToFile] 桌面端保存异常，回退:', e)
    }
  }
  // Tauri 桌面端：用原生「另存为」对话框 + 文件写入
  if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
    try {
      const { save: tauriSave } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile: tauriWriteTextFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await tauriSave({
        defaultPath: filename,
        filters: [{ name: 'JSON 备份', extensions: ['json'] }]
      })
      if (filePath) {
        await tauriWriteTextFile(filePath, content)
        return filePath
      }
      return null // 用户取消了对话框
    } catch (e) {
      console.warn('[saveTextToFile] Tauri 保存异常，回退浏览器下载:', e)
    }
  }
  // 浏览器回退
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return null
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function nowStr() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
