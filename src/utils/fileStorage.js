/**
 * 本地文件系统存储模块（v2 规范化目录结构）
 *
 * 双模式架构：
 * - 浏览器：File System Access API (showDirectoryPicker)
 * - Electron：dialog.showOpenDialog + Node.js fs
 *
 * 架构（v2）：
 * - 用户选择一个基础文件夹（如 F:\AppData\WorkBuddy\硕士工作台数据）
 * - 目录结构规范化为：
 *   /
 *     meta.json          # 元信息（版本、最后同步时间）
 *     data/              # 按模块拆分的 JSON 数据（mw_<key>.json）
 *     backups/           # 自动备份历史
 *     attachments/       # PDF、头像、背景图等大文件
 *     exports/           # 手动导出的 JSON/Excel
 * - 浏览器：文件夹句柄存储在 IndexedDB 中（跨会话持久化）
 * - Electron：文件夹路径存储在 localStorage 中
 * - 首次加载时自动恢复上次的文件夹权限
 *
 * 权限持久化策略（浏览器）：
 * - 浏览器要求 requestPermission() 必须有用户手势
 * - 页面加载时只能 queryPermission()，不能自动请求
 * - 如果权限为 'prompt'，显示恢复按钮让用户点击触发
 *
 * Electron 下权限由操作系统管理，无需弹窗恢复。
 */

import { isTauriRuntime, createTauriDirHandle, pickFolderWithTauri, getDefaultDataDir, TAURI_ROOT_KEY, TAURI_BACKUP_KEY } from './tauriFs'

const DB_NAME = '硕士工作台_FileStorage'
const DB_VERSION = 1
const STORE_NAME = 'handles'
const HANDLE_KEY = 'directoryHandle'

const DATA_DIR = 'data'
const ATTACHMENTS_DIR = 'attachments'
const BACKUPS_DIR = 'backups'
const EXPORTS_DIR = 'exports'
const META_FILE = 'meta.json'
const APP_VERSION_TAG = '5.0.100'

// ========== IndexedDB 封装 ==========

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveHandleToDB(handle) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(handle, HANDLE_KEY)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function loadHandleFromDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(HANDLE_KEY)
    req.onsuccess = () => { db.close(); resolve(req.result || null) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

async function removeHandleFromDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(HANDLE_KEY)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

// ========== 本地文件夹操作 ==========

/** 当前选中的基础文件夹句柄（内存中） */
let dirHandle = null

/** 权限状态：'granted' | 'prompt' | 'denied' */
let permissionState = 'denied'

/** 缓存的 data 目录句柄 */
let dataDirHandle = null

/** 存储路径前缀 */
const FILE_PREFIX = 'mw_'

/** 检查 File System Access API 是否可用 */
export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

/** 文件存储是否已激活（句柄存在 + 权限已授予） */
export function isFileStorageActive() {
  return dirHandle !== null && permissionState === 'granted'
}

/** 文件夹句柄存在但权限待恢复 */
export function needsRegrant() {
  return dirHandle !== null && permissionState === 'prompt'
}

/** 获取当前选中的文件夹名称 */
export function getFolderName() {
  return dirHandle ? dirHandle.name : ''
}

/** 获取当前选中的基础文件夹句柄 */
export function getBaseDirHandle() {
  return dirHandle
}

/**
 * 尝试恢复上次的文件夹权限（页面加载时调用）
 *
 * 返回：
 * - 'active'   → 权限有效，可正常读写
 * - 'prompt'   → 句柄存在但权限待恢复（需要用户手势点击）
 * - 'inactive' → 无句柄或权限被拒绝
 */
export async function initFileStorage() {
  // Tauri 桌面环境：优先用已配置路径；未配置时自动使用默认数据目录（开箱即用，数据落盘本地）
  if (isTauriRuntime()) {
    let root = localStorage.getItem(TAURI_ROOT_KEY)
    if (!root) {
      const def = await getDefaultDataDir()
      if (def) {
        root = def
        localStorage.setItem(TAURI_ROOT_KEY, def)
      }
    }
    if (!root) return 'inactive'
    dirHandle = createTauriDirHandle(root)
    permissionState = 'granted'
    try { await ensureDirectoryStructure() } catch (e) { console.warn('[fileStorage] tauri ensure structure failed:', e) }
    return 'active'
  }
  if (!isFileSystemAccessSupported()) return 'inactive'
  try {
    const saved = await loadHandleFromDB()
    if (!saved) return 'inactive'

    // 只查询权限状态，不自动请求（需要用户手势）
    const state = await queryPermissionOnly(saved)
    permissionState = state

    if (state === 'granted') {
      dirHandle = saved
      await ensureDirectoryStructure()
      return 'active'
    }
    if (state === 'prompt') {
      // 句柄有效，但权限需要用户手势续期
      // 保留句柄，等待用户点击恢复按钮
      dirHandle = saved
      return 'prompt'
    }
    // denied → 清除
    dirHandle = null
    dataDirHandle = null
    return 'inactive'
  } catch {
    return 'inactive'
  }
}

/**
 * 确保规范化目录结构存在：data / attachments / backups / exports
 */
async function ensureDirectoryStructure() {
  if (!dirHandle) return
  try {
    await dirHandle.getDirectoryHandle(DATA_DIR, { create: true })
    await dirHandle.getDirectoryHandle(ATTACHMENTS_DIR, { create: true })
    await dirHandle.getDirectoryHandle(BACKUPS_DIR, { create: true })
    await dirHandle.getDirectoryHandle(EXPORTS_DIR, { create: true })
    await migrateLegacyFiles()
    await writeMeta()
  } catch (e) {
    console.warn('[fileStorage] ensureDirectoryStructure failed:', e)
  }
}

/**
 * 迁移旧版根目录下的 mw_*.json 文件到 data/ 子目录
 */
async function migrateLegacyFiles() {
  if (!dirHandle) return
  try {
    const entries = dirHandle.values()
    const filesToMove = []
    for await (const entry of entries) {
      if (entry.kind === 'file' && entry.name.startsWith(FILE_PREFIX) && entry.name.endsWith('.json')) {
        filesToMove.push(entry)
      }
    }
    if (filesToMove.length === 0) return
    const dataDir = await dirHandle.getDirectoryHandle(DATA_DIR, { create: true })
    for (const entry of filesToMove) {
      try {
        const file = await entry.getFile()
        const text = await file.text()
        const newHandle = await dataDir.getFileHandle(entry.name, { create: true })
        const writable = await newHandle.createWritable()
        await writable.write(text)
        await writable.close()
        await dirHandle.removeEntry(entry.name)
      } catch (e) {
        console.warn(`[fileStorage] migrateLegacyFiles failed for ${entry.name}:`, e)
      }
    }
    console.log('[fileStorage] migrated legacy files to data/')
  } catch (e) {
    console.warn('[fileStorage] migrateLegacyFiles error:', e)
  }
}

/**
 * 获取 data 目录句柄（缓存）
 */
async function getDataDirHandle() {
  if (dataDirHandle) return dataDirHandle
  if (!dirHandle) throw new Error('未选择存储文件夹')
  dataDirHandle = await dirHandle.getDirectoryHandle(DATA_DIR, { create: true })
  return dataDirHandle
}

/**
 * 写入/更新 meta.json
 */
async function writeMeta() {
  if (!dirHandle) return
  try {
    const handle = await dirHandle.getFileHandle(META_FILE, { create: true })
    const writable = await handle.createWritable()
    await writable.write(JSON.stringify({
      app: '硕士工作台',
      version: APP_VERSION_TAG,
      lastSync: new Date().toISOString(),
      storageVersion: 2,
    }, null, 2))
    await writable.close()
  } catch (e) {
    console.warn('[fileStorage] writeMeta failed:', e)
  }
}

/**
 * 获取附件目录句柄（用于 PDF、头像、背景图等大文件）
 */
export async function getAttachmentDirHandle() {
  if (!dirHandle) throw new Error('未选择存储文件夹')
  return await dirHandle.getDirectoryHandle(ATTACHMENTS_DIR, { create: true })
}

/** 仅查询权限状态，不请求（无需用户手势） */
async function queryPermissionOnly(handle) {
  if (!handle) return 'denied'
  try {
    if (typeof handle.queryPermission === 'function') {
      return await handle.queryPermission({ mode: 'readwrite' })
    }
    return 'granted' // 无法查询，假定有权限
  } catch {
    return 'denied'
  }
}

/**
 * 恢复文件存储权限（必须在用户手势中调用，如按钮点击）
 * 返回 true 表示权限已恢复
 */
export async function regrantPermission() {
  if (!dirHandle) return false
  try {
    if (typeof dirHandle.requestPermission !== 'function') return true
    const result = await dirHandle.requestPermission({ mode: 'readwrite' })
    if (result === 'granted') {
      permissionState = 'granted'
      await ensureDirectoryStructure()
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * 弹出文件夹选择器，让用户选择存储目录
 */
export async function selectStorageFolder() {
  // Tauri 桌面环境：原生目录选择对话框，路径存 localStorage
  if (isTauriRuntime()) {
    const root = await pickFolderWithTauri()
    if (!root) return null
    localStorage.setItem(TAURI_ROOT_KEY, root)
    dirHandle = createTauriDirHandle(root)
    dataDirHandle = null
    permissionState = 'granted'
    await ensureDirectoryStructure()
    return dirHandle.name
  }
  if (!isFileSystemAccessSupported()) {
    throw new Error('当前浏览器不支持 File System Access API，请使用 Chrome 或 Edge 浏览器。')
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    dirHandle = handle
    dataDirHandle = null
    permissionState = 'granted'
    await saveHandleToDB(handle)
    await ensureDirectoryStructure()
    return handle.name
  } catch (e) {
    if (e.name === 'AbortError') return null // 用户取消
    throw e
  }
}

/**
 * 清除文件夹绑定
 */
export async function clearStorageFolder() {
  dirHandle = null
  dataDirHandle = null
  permissionState = 'denied'
  if (isTauriRuntime()) {
    localStorage.removeItem(TAURI_ROOT_KEY)
    return
  }
  await removeHandleFromDB()
}

// ========== 数据读写 ==========

/**
 * 读取单个键的数据
 */
export async function fileRead(key) {
  if (!dirHandle) return null
  try {
    const dataDir = await getDataDirHandle()
    const fileName = FILE_PREFIX + key + '.json'
    const fileHandle = await dataDir.getFileHandle(fileName, { create: false })
    const file = await fileHandle.getFile()
    const text = await file.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ========== 写入合并队列（防止高频写盘占满主线程） ==========
// 同一 key 的连续写入合并为最后一次（last-write-wins），
// 写盘串行执行，避免后台恢复瞬间大量 createWritable 并发排队卡住 UI。

const writeQueue = new Map() // key -> { item, promise, resolve, reject }
let writeFlushing = false

function enqueueWrite(key, item) {
  // 同 key 已有排队写 → 覆盖最新值，复用原 promise（合并）
  const existing = writeQueue.get(key)
  if (existing) {
    existing.item = item
    return existing.promise
  }
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  writeQueue.set(key, { item, promise, resolve, reject })
  scheduleWriteFlush()
  return promise
}

function scheduleWriteFlush() {
  if (writeFlushing) return
  writeFlushing = true
  setTimeout(flushWriteQueue, 0)
}

async function flushWriteQueue() {
  while (writeQueue.size > 0) {
    const entries = [...writeQueue.entries()]
    writeQueue.clear()
    for (const [key, entry] of entries) {
      try {
        await doFileWrite(key, entry.item)
        entry.resolve(true)
      } catch (e) {
        console.warn(`[fileStorage] queued write failed for "${key}":`, e)
        entry.reject(e)
      }
    }
  }
  writeFlushing = false
}

async function doFileWrite(key, item) {
  const dataDir = await getDataDirHandle()
  const fileName = FILE_PREFIX + key + '.json'
  const fileHandle = await dataDir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  if (item.raw !== undefined) {
    await writable.write(item.raw)
  } else {
    await writable.write(JSON.stringify(item.value, null, 2))
  }
  await writable.close()
  // 写入成功说明权限已恢复
  if (permissionState !== 'granted') permissionState = 'granted'
  await writeMeta()
  return true
}

/**
 * 写入单个键的数据（合并队列：同 key 高频写只落盘一次）
 */
export function fileWrite(key, value) {
  if (!dirHandle) return Promise.reject(new Error('未选择存储文件夹'))
  return enqueueWrite(key, { value })
}

/**
 * 以原始文本写入单个键的数据（不二次编码，用于恢复备份中已序列化的字符串值）
 */
export function fileWriteRaw(key, rawText) {
  if (!dirHandle) return Promise.reject(new Error('未选择存储文件夹'))
  return enqueueWrite(key, { raw: rawText })
}

/**
 * 读取所有 mw_* 数据
 */
export async function fileReadAll() {
  if (!dirHandle) return {}
  const data = {}
  try {
    const dataDir = await getDataDirHandle()
    const entries = dataDir.values()
    for await (const entry of entries) {
      if (entry.kind === 'file' && entry.name.startsWith(FILE_PREFIX) && entry.name.endsWith('.json')) {
        try {
          const key = entry.name.slice(FILE_PREFIX.length, -5)
          const file = await entry.getFile()
          const text = await file.text()
          data[key] = JSON.parse(text)
        } catch {
          // 跳过无法解析的文件
        }
      }
    }
  } catch (e) {
    console.error('[fileStorage] Failed to read all:', e)
  }
  return data
}

/**
 * 列出存储文件夹中所有 mw_* JSON 文件及其元数据
 * @returns {Promise<Array<{name: string, type: string, size: number, lastModified: number, key: string}>>}
 */
export async function listStorageFiles() {
  if (!dirHandle) return []
  const files = []
  try {
    const dataDir = await getDataDirHandle()
    const entries = dataDir.values()
    for await (const entry of entries) {
      if (entry.kind === 'file' && entry.name.startsWith(FILE_PREFIX) && entry.name.endsWith('.json')) {
        const file = await entry.getFile()
        files.push({
          name: entry.name,
          type: 'JSON 数据文件',
          size: file.size,
          lastModified: file.lastModified,
          key: entry.name.slice(FILE_PREFIX.length, -5),
        })
      }
    }
  } catch (e) {
    console.error('[fileStorage] Failed to list files:', e)
  }
  files.sort((a, b) => b.lastModified - a.lastModified)
  return files
}

/**
 * 批量写入所有数据（用于迁移/全量导出）
 */
export async function fileWriteAll(data) {
  if (!dirHandle) throw new Error('未选择存储文件夹')
  try {
    const dataDir = await getDataDirHandle()
    const entries = dataDir.values()
    for await (const entry of entries) {
      if (entry.kind === 'file' && entry.name.startsWith(FILE_PREFIX)) {
        try { await dataDir.removeEntry(entry.name) } catch {}
      }
    }
  } catch {}

  for (const [key, value] of Object.entries(data)) {
    await fileWrite(key, value)
  }
}

// ========== JSON 自动备份功能 ==========

const BACKUP_HANDLE_KEY = 'backupDirectoryHandle'

/** 自动备份文件夹句柄（内存中） */
let backupDirHandle = null

/** 自动备份权限状态 */
let backupPermissionState = 'denied'

/** 上次备份时间戳（防抖：30秒内不重复备份） */
let lastBackupTime = 0
const BACKUP_DEBOUNCE_MS = 30000

/**
 * 检查自动备份是否已激活
 */
export function isBackupActive() {
  return backupDirHandle !== null && backupPermissionState === 'granted'
}

/**
 * 获取自动备份文件夹名称
 */
export function getBackupFolderName() {
  return backupDirHandle ? backupDirHandle.name : ''
}

/**
 * 初始化自动备份（页面加载时调用，恢复上次授权）
 */
export async function initBackupStorage() {
  // Tauri 桌面环境：从 localStorage 恢复备份根路径
  if (isTauriRuntime()) {
    const root = localStorage.getItem(TAURI_BACKUP_KEY)
    if (!root) return 'inactive'
    backupDirHandle = createTauriDirHandle(root)
    backupPermissionState = 'granted'
    return 'active'
  }
  if (!isFileSystemAccessSupported()) return 'inactive'
  try {
    const saved = await loadBackupHandleFromDB()
    if (!saved) return 'inactive'
    const state = await queryPermissionOnly(saved)
    backupPermissionState = state
    if (state === 'granted') {
      backupDirHandle = saved
      return 'active'
    }
    if (state === 'prompt') {
      backupDirHandle = saved
      return 'prompt'
    }
    backupDirHandle = null
    return 'inactive'
  } catch {
    return 'inactive'
  }
}

/**
 * 从 IndexedDB 加载备份文件夹句柄
 */
async function loadBackupHandleFromDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(BACKUP_HANDLE_KEY)
    req.onsuccess = () => { db.close(); resolve(req.result || null) }
    req.onerror = () => { db.close(); reject(tx.error) }
  })
}

/**
 * 保存备份文件夹句柄到 IndexedDB
 */
async function saveBackupHandleToDB(handle) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(handle, BACKUP_HANDLE_KEY)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/**
 * 清除备份文件夹绑定
 */
export async function clearBackupFolder() {
  backupDirHandle = null
  backupPermissionState = 'denied'
  if (isTauriRuntime()) {
    localStorage.removeItem(TAURI_BACKUP_KEY)
    return
  }
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(BACKUP_HANDLE_KEY)
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  } catch {}
}

/**
 * 弹出文件夹选择器选择自动备份目录
 */
export async function selectBackupFolder() {
  // Tauri 桌面环境：原生目录选择对话框，路径存 localStorage
  if (isTauriRuntime()) {
    const root = await pickFolderWithTauri()
    if (!root) return null
    localStorage.setItem(TAURI_BACKUP_KEY, root)
    backupDirHandle = createTauriDirHandle(root)
    backupPermissionState = 'granted'
    return backupDirHandle.name
  }
  if (!isFileSystemAccessSupported()) {
    throw new Error('当前浏览器不支持 File System Access API，请使用 Chrome 或 Edge 浏览器。')
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    backupDirHandle = handle
    backupPermissionState = 'granted'
    await saveBackupHandleToDB(handle)
    return handle.name
  } catch (e) {
    if (e.name === 'AbortError') return null
    throw e
  }
}

/**
 * 恢复备份文件夹权限（用户手势触发）
 */
export async function regrantBackupPermission() {
  if (!backupDirHandle) return false
  try {
    if (typeof backupDirHandle.requestPermission !== 'function') return true
    const result = await backupDirHandle.requestPermission({ mode: 'readwrite' })
    if (result === 'granted') {
      backupPermissionState = 'granted'
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * 执行自动备份：将所有 localStorage 数据导出为 JSON 写入备份文件夹
 * 带防抖机制，30秒内不重复备份
 *
 * @param {Object} data - 要备份的数据对象（键值对）
 * @returns {Promise<boolean>} 是否成功写入
 */
export async function writeAutoBackup(data) {
  if (!backupDirHandle || backupPermissionState !== 'granted') return false

  // 防抖检查
  const now = Date.now()
  if (now - lastBackupTime < BACKUP_DEBOUNCE_MS) return false
  lastBackupTime = now

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `auto_backup_${timestamp}.json`
    const fileHandle = await backupDirHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify({
      app: '硕士工作台',
      version: APP_VERSION_TAG,
      exportedAt: new Date().toISOString(),
      dataCount: Object.keys(data).length,
      data
    }, null, 2))
    await writable.close()

    // 只保留最近 20 个备份文件，删除旧的
    await cleanupOldBackups(20)

    return true
  } catch (e) {
    console.warn('[fileStorage] Auto-backup failed:', e)
    return false
  }
}

/**
 * 清理旧备份文件，只保留最新的 count 个
 */
async function cleanupOldBackups(maxKeep) {
  if (!backupDirHandle) return
  try {
    const entries = []
    for await (const entry of backupDirHandle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith('auto_backup_') && entry.name.endsWith('.json')) {
        const file = await entry.getFile()
        entries.push({ name: entry.name, handle: entry, time: file.lastModified })
      }
    }
    // 按修改时间倒序排列，保留前 maxKeep 个
    entries.sort((a, b) => b.time - a.time)
    for (let i = maxKeep; i < entries.length; i++) {
      try { await backupDirHandle.removeEntry(entries[i].name) } catch {}
    }
  } catch {}
}

// ========== 主文件夹 backups/ 统一备份（v3 单文件夹方案） ==========
// 数据与备份合并到同一个本地文件夹：data/ 存当前数据，backups/ 存历史备份。
// 用户只需绑定一个文件夹，自动备份、升级快照、手动备份与回退都基于它，杜绝漏配备份。

const MAIN_BACKUP_KEEP = 20   // 自动备份保留份数
const SNAPSHOT_KEEP = 10      // 快照（升级/导入前）保留份数
const MANUAL_KEEP = 20        // 手动备份保留份数

/**
 * 将全量数据写入主文件夹 backups/ 目录
 * @param {Object} data 全量数据（键为 mw_ 前缀，值为序列化字符串，与导出 JSON 一致）
 * @param {string} kind 'auto' 自动备份 | 'snapshot' 升级/导入前快照 | 'manual' 手动备份
 * @param {string} label 快照说明（可选，snapshot 类型使用）
 * @returns {Promise<boolean>}
 */
export async function writeMainBackup(data, kind = 'auto', label = '') {
  if (!dirHandle || permissionState !== 'granted') return false
  try {
    const backupsDir = await dirHandle.getDirectoryHandle(BACKUPS_DIR, { create: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    let fileName
    if (kind === 'snapshot') {
      const safeLabel = String(label || '快照').replace(/[\\/:*?"<>|]/g, '_').slice(0, 24)
      fileName = `snapshot_${ts}_${safeLabel}.json`
    } else if (kind === 'manual') {
      fileName = `manual_${ts}.json`
    } else {
      fileName = `auto_backup_${ts}.json`
    }
    const fileHandle = await backupsDir.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify({
      app: '硕士工作台',
      kind,
      label: label || '',
      version: APP_VERSION_TAG,
      exportedAt: new Date().toISOString(),
      dataCount: Object.keys(data).length,
      data,
    }, null, 2))
    await writable.close()
    const keep = kind === 'snapshot' ? SNAPSHOT_KEEP : (kind === 'manual' ? MANUAL_KEEP : MAIN_BACKUP_KEEP)
    const prefix = kind === 'snapshot' ? 'snapshot_' : (kind === 'manual' ? 'manual_' : 'auto_backup_')
    await cleanupMainBackups(keep, prefix)
    return true
  } catch (e) {
    console.warn('[fileStorage] writeMainBackup failed:', e)
    return false
  }
}

/** 清理主文件夹 backups/ 中指定前缀的旧备份 */
async function cleanupMainBackups(maxKeep, prefix) {
  if (!dirHandle) return
  try {
    const backupsDir = await dirHandle.getDirectoryHandle(BACKUPS_DIR, { create: true })
    const entries = []
    for await (const entry of backupsDir.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(prefix) && entry.name.endsWith('.json')) {
        const file = await entry.getFile()
        entries.push({ name: entry.name, handle: entry, time: file.lastModified })
      }
    }
    entries.sort((a, b) => b.time - a.time)
    for (let i = maxKeep; i < entries.length; i++) {
      try { await backupsDir.removeEntry(entries[i].name) } catch {}
    }
  } catch {}
}

/**
 * 列出主文件夹 backups/ 中的所有备份文件
 * @returns {Promise<Array<{name: string, kind: string, size: number, lastModified: number}>>}
 */
export async function listMainBackups() {
  if (!dirHandle || permissionState !== 'granted') return []
  const list = []
  try {
    const backupsDir = await dirHandle.getDirectoryHandle(BACKUPS_DIR, { create: true })
    for await (const entry of backupsDir.values()) {
      if (entry.kind !== 'file' || !entry.name.endsWith('.json')) continue
      const file = await entry.getFile()
      let kind = 'auto'
      if (entry.name.startsWith('snapshot_')) kind = 'snapshot'
      else if (entry.name.startsWith('manual_')) kind = 'manual'
      list.push({ name: entry.name, kind, size: file.size, lastModified: file.lastModified })
    }
  } catch (e) {
    console.warn('[fileStorage] listMainBackups failed:', e)
  }
  list.sort((a, b) => b.lastModified - a.lastModified)
  return list
}

/** 读取主文件夹 backups/ 中指定备份的完整内容 */
export async function readMainBackup(name) {
  if (!dirHandle || permissionState !== 'granted') return null
  try {
    const backupsDir = await dirHandle.getDirectoryHandle(BACKUPS_DIR, { create: true })
    const fileHandle = await backupsDir.getFileHandle(name, { create: false })
    const file = await fileHandle.getFile()
    const text = await file.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** 删除主文件夹 backups/ 中指定备份 */
export async function deleteMainBackup(name) {
  if (!dirHandle || permissionState !== 'granted') return false
  try {
    const backupsDir = await dirHandle.getDirectoryHandle(BACKUPS_DIR, { create: true })
    await backupsDir.removeEntry(name)
    return true
  } catch {
    return false
  }
}

/**
 * 从主文件夹备份恢复：读取备份 → 写回 data/（当前数据，恢复到备份时刻状态）
 * @returns {Promise<{ok: boolean, count: number, modules: string[]}>}
 */
export async function restoreMainBackup(name) {
  if (!dirHandle || permissionState !== 'granted') return { ok: false, count: 0, modules: [] }
  const backup = await readMainBackup(name)
  if (!backup || !backup.data || typeof backup.data !== 'object') return { ok: false, count: 0, modules: [] }
  let count = 0
  const modules = []
  try {
    for (const [key, value] of Object.entries(backup.data)) {
      if (value === null || value === undefined || value === '') continue
      const bare = key.startsWith(FILE_PREFIX) ? key.slice(FILE_PREFIX.length) : key
      let raw = typeof value === 'string' ? value : JSON.stringify(value)
      try {
        const parsed = JSON.parse(raw)
        raw = JSON.stringify(parsed, null, 2)
      } catch {}
      await fileWriteRaw(bare, raw)
      modules.push(bare)
      count++
    }
    return { ok: true, count, modules }
  } catch (e) {
    console.warn('[fileStorage] restoreMainBackup failed:', e)
    return { ok: false, count, modules }
  }
}
