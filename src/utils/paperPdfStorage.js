/**
 * 论文 PDF 本地存储模块
 *
 * 使用 File System Access API 将用户上传的 PDF 文献复制到本地指定文件夹，
 * 并支持后续直接打开。
 *
 * 双通道：Tauri 桌面环境走 @tauri-apps/plugin-fs 二进制读写（WebView2 不支持
 * File System Access API），浏览器环境保持原逻辑不变。
 */

import { isTauriRuntime, pickFolderWithTauri, getDefaultDataDir } from './tauriFs'
import { readFile, writeFile, exists, remove, mkdir } from '@tauri-apps/plugin-fs'

const DB_NAME = '研究生工作台_PaperPdfStorage'
const DB_VERSION = 2
const STORE_NAME = 'handles'
const BLOB_STORE = 'pdfBlobs'
const HANDLE_KEY = 'pdfDirHandle'

// Tauri 环境 PDF 目录路径的 localStorage key
const TAURI_PDF_DIR_KEY = 'tauri_pdf_dir'

// ========== IndexedDB ==========

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE)
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

// ========== IndexedDB Blob 兜底存储（未配置目录时自动启用，Web 端的「data 文件夹」）==========

async function saveBlobToDB(name, blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite')
    tx.objectStore(BLOB_STORE).put(blob, name)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function loadBlobFromDB(name) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readonly')
    const req = tx.objectStore(BLOB_STORE).get(name)
    req.onsuccess = () => { db.close(); resolve(req.result || null) }
    req.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function blobExistsInDB(name) {
  try {
    const b = await loadBlobFromDB(name)
    return !!b
  } catch {
    return false
  }
}

async function deleteBlobFromDB(name) {
  if (!name) return
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite')
    tx.objectStore(BLOB_STORE).delete(name)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); resolve() }
  })
}

// ========== 运行时状态 ==========

let dirHandle = null
let dirName = ''
let isActive = false

// Tauri 环境：目录绝对路径（无需句柄）
let dirPath = ''

/** 初始化：尝试从 IndexedDB 恢复目录句柄 */
export async function initPdfDir() {
  // Tauri 桌面环境：优先用已配置路径；未配置时自动使用「默认数据目录/PDF」（开箱即用）
  if (isTauriRuntime()) {
    let root = localStorage.getItem(TAURI_PDF_DIR_KEY)
    if (!root) {
      const def = await getDefaultDataDir()
      if (def) {
        root = def.replace(/[\\/]+$/, '') + '/PDF'
        try { await mkdir(root, { recursive: true }) } catch (e) { console.warn('[paperPdfStorage] mkdir default pdf dir failed:', e) }
        localStorage.setItem(TAURI_PDF_DIR_KEY, root)
      }
    }
    if (!root) return { active: false, name: '' }
    dirPath = root
    dirName = root.split(/[\\/]/).filter(Boolean).pop() || root
    isActive = true
    return { active: true, name: dirName }
  }
  try {
    const handle = await loadHandleFromDB()
    if (handle) {
      const perm = await handle.queryPermission({ mode: 'readwrite' })
      if (perm === 'granted') {
        dirHandle = handle
        dirName = handle.name
        isActive = true
        return { active: true, name: dirName }
      } else {
        // 权限过期，清除旧句柄
        await removeHandleFromDB()
        dirHandle = null
        dirName = ''
        isActive = false
        return { active: false, name: '', needsRegrant: true }
      }
    }
    return { active: false, name: '' }
  } catch {
    return { active: false, name: '' }
  }
}

/** 选择 PDF 存放目录 */
export async function selectPdfDir() {
  // Tauri 桌面环境：原生目录选择对话框
  if (isTauriRuntime()) {
    const root = await pickFolderWithTauri()
    if (!root) return { active: isActive, name: dirName }
    localStorage.setItem(TAURI_PDF_DIR_KEY, root)
    dirPath = root
    dirName = root.split(/[\\/]/).filter(Boolean).pop() || root
    isActive = true
    return { active: true, name: dirName }
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    dirHandle = handle
    dirName = handle.name
    isActive = true
    await saveHandleToDB(handle)
    return { active: true, name: dirName }
  } catch (e) {
    if (e.name === 'AbortError') return { active: isActive, name: dirName }
    throw e
  }
}

/** 去重文件名：若已存在同名，在扩展名前插入随机后缀 */
async function dedupeName(name) {
  if (!(await pdfExists(name))) return name
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  return base + '_' + Math.random().toString(36).slice(2, 6) + ext
}

/** 保存 PDF：优先写入已配置的本地目录，未配置或写入失败时自动存入 IndexedDB（Web 端 data 文件夹） */
export async function savePdfToDir(file, paperId) {
  const safeName = await dedupeName(file.name)

  // 1) 已配置目录：优先写入真实文件夹
  if (isActive) {
    try {
      // Tauri 桌面环境：二进制直接写盘
      if (isTauriRuntime()) {
        const buf = new Uint8Array(await file.arrayBuffer())
        await writeFile(dirPath.replace(/[\\/]+$/, '') + '/' + safeName, buf)
        return safeName
      }
      // 浏览器 File System Access API
      const fileHandle = await dirHandle.getFileHandle(safeName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(file)
      await writable.close()
      return safeName
    } catch (e) {
      console.warn('写入目录失败，回退到本地数据库存储：', e)
      // 继续走 IndexedDB 兜底
    }
  }

  // 2) 兜底：存入浏览器 IndexedDB（无需配置，开箱即用）
  await saveBlobToDB(safeName, file)
  return safeName
}

/** 从目录或 IndexedDB 读取 PDF 文件并返回 Blob URL */
export async function openPdfFromDir(fileName) {
  // 1) 已配置目录优先
  if (isActive) {
    try {
      // Tauri 桌面环境：读取二进制 → Blob URL
      if (isTauriRuntime()) {
        const buf = await readFile(dirPath.replace(/[\\/]+$/, '') + '/' + fileName)
        const blob = new Blob([buf])
        return { url: URL.createObjectURL(blob), name: fileName, source: 'dir' }
      }
      const fileHandle = await dirHandle.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      return { url: URL.createObjectURL(file), name: file.name, source: 'dir' }
    } catch (e) {
      console.warn('从目录读取失败，尝试本地数据库：', e)
      // 继续走 IndexedDB 兜底
    }
  }

  // 2) 兜底：从 IndexedDB 读取
  const blob = await loadBlobFromDB(fileName)
  if (blob) return { url: URL.createObjectURL(blob), name: fileName, source: 'idb' }
  throw new Error('未找到 PDF 文件：' + fileName)
}

/** 检查 PDF 文件是否存在（目录或 IndexedDB 任一存在即可） */
export async function pdfExists(fileName) {
  if (!fileName) return false
  // Tauri 桌面环境
  if (isActive && isTauriRuntime()) {
    try { return await exists(dirPath.replace(/[\\/]+$/, '') + '/' + fileName) } catch { /* 继续检查 IDB */ }
  }
  if (isActive && !isTauriRuntime()) {
    try {
      await dirHandle.getFileHandle(fileName)
      return true
    } catch { /* 继续检查 IDB */ }
  }
  return await blobExistsInDB(fileName)
}

/**
 * Tauri 桌面环境：确保 PDF 已落盘到当前 PDF 目录。
 * 历史数据可能仍存于 IndexedDB（浏览器缓存），桌面版打开前先写入本地目录，
 * 这样外部软件（CAJViewer 等）才能直接打开本地文件。
 * 返回本地完整路径；失败返回 null。
 */
export async function ensurePdfOnDisk(fileName) {
  if (!fileName) return null
  if (!isActive || !isTauriRuntime()) return null
  const dir = dirPath.replace(/[\\/]+$/, '')
  const fullPath = dir + '/' + fileName
  // 已在本地目录 → 直接返回
  try {
    if (await exists(fullPath)) return fullPath
  } catch { /* 继续 */ }
  // 从 IndexedDB 读取并写入本地目录
  try {
    const blob = await loadBlobFromDB(fileName)
    if (!blob) return null
    const buf = new Uint8Array(await blob.arrayBuffer())
    await mkdir(dir, { recursive: true })
    await writeFile(fullPath, buf)
    // 写入成功后删除 IndexedDB 中的副本（已落盘本地）
    await deleteBlobFromDB(fileName)
    return fullPath
  } catch (e) {
    console.warn('[paperPdfStorage] ensurePdfOnDisk failed:', e)
    return null
  }
}

/** 删除已关联的 PDF（目录与 IndexedDB 一并清理） */
export async function deletePdfFromStorage(fileName) {
  if (!fileName) return
  if (isActive) {
    try {
      if (isTauriRuntime()) {
        await remove(dirPath.replace(/[\\/]+$/, '') + '/' + fileName)
      } else {
        await dirHandle.removeEntry(fileName)
      }
    } catch { /* 忽略缺失 */ }
  }
  await deleteBlobFromDB(fileName)
}

/** 获取当前目录信息（未配置时 fallbackIdb=true，表示走 IndexedDB 兜底） */
export function getPdfDirInfo() {
  return { active: isActive, name: dirName, fallbackIdb: !isActive }
}

/** 暴露 Tauri 运行时判断，供上层决定打开方式 */
export { isTauriRuntime }

/** 重新授权 */
export async function regrantPdfPermission() {
  // Tauri 桌面环境：路径权限由操作系统管理，始终可用
  if (isTauriRuntime()) {
    isActive = true
    return true
  }
  if (!dirHandle) return false
  const perm = await dirHandle.requestPermission({ mode: 'readwrite' })
  if (perm === 'granted') {
    isActive = true
    await saveHandleToDB(dirHandle)
    return true
  }
  return false
}

/** 取消绑定 */
export async function unbindPdfDir() {
  dirHandle = null
  dirName = ''
  isActive = false
  dirPath = ''
  if (isTauriRuntime()) {
    localStorage.removeItem(TAURI_PDF_DIR_KEY)
    return
  }
  await removeHandleFromDB()
}
