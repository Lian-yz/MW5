/**
 * 仿真结果图片本地存储模块
 *
 * 需求：仿真库「新增仿真记录」的「仿真结果」支持上传图片，图片大小不限。
 *
 * 双通道存储：
 * 1. Tauri 桌面端：图片落盘到「默认数据目录/仿真图片」本地文件夹（大小不限，
 *    不占 localStorage；路径如 C:\Users\xxx\AppData\Roaming\com.mastersworkbench.app\硕士工作台数据\仿真图片）
 * 2. 浏览器端：无文件系统，回退 IndexedDB（同样大小不限，不占 localStorage）
 *
 * 数据模型：仿真记录 record.resultImages 保存图片文件名数组，如 ['sim_xxx.png', ...]
 */

import { isTauriRuntime, getDefaultDataDir, pickFolderWithTauri } from './tauriFs'
import { readFile, writeFile, exists, remove, mkdir } from '@tauri-apps/plugin-fs'

const DB_NAME = '硕士工作台_SimImageStorage'
const DB_VERSION = 1
const STORE_NAME = 'simImages'
// Tauri 环境图片目录路径的 localStorage key
const TAURI_SIM_IMG_DIR_KEY = 'tauri_sim_img_dir'

// ========== IndexedDB ==========

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveBlobToDB(name, blob) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, name)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function loadBlobFromDB(name) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(name)
    req.onsuccess = () => { db.close(); resolve(req.result || null) }
    req.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function deleteBlobFromDB(name) {
  if (!name) return
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(name)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); resolve() }
  })
}

// ========== 运行时状态 ==========

let dirPath = ''
let isActive = false

/** 初始化：Tauri 环境自动使用「默认数据目录/仿真结果」，未配置时开箱即用 */
export async function initSimImgDir() {
  if (isTauriRuntime()) {
    let root = localStorage.getItem(TAURI_SIM_IMG_DIR_KEY)
    if (!root) {
      const def = await getDefaultDataDir()
      if (def) {
        root = def.replace(/[\\/]+$/, '') + '/仿真结果'
        try { await mkdir(root, { recursive: true }) } catch (e) { console.warn('[simImageStorage] mkdir default dir failed:', e) }
        localStorage.setItem(TAURI_SIM_IMG_DIR_KEY, root)
      }
    }
    if (!root) return { active: false, name: '' }
    dirPath = root
    isActive = true
    return { active: true, name: dirPath }
  }
  return { active: false, name: '' }
}

/** 选择自定义图片存放目录（Tauri 原生目录选择对话框） */
export async function selectSimImgDir() {
  if (isTauriRuntime()) {
    const root = await pickFolderWithTauri()
    if (!root) return { active: isActive, name: dirPath }
    localStorage.setItem(TAURI_SIM_IMG_DIR_KEY, root)
    dirPath = root
    isActive = true
    try { await mkdir(root, { recursive: true }) } catch (e) { console.warn('[simImageStorage] mkdir custom dir failed:', e) }
    return { active: true, name: dirPath }
  }
  return { active: false, name: '' }
}

/** 取消自定义目录，恢复默认数据目录 */
export async function unbindSimImgDir() {
  if (isTauriRuntime()) {
    localStorage.removeItem(TAURI_SIM_IMG_DIR_KEY)
    dirPath = ''
    isActive = false
    // 重新初始化为默认目录
    return await initSimImgDir()
  }
  return { active: false, name: '' }
}

/** 获取图片存放目录信息 */
export function getSimImgDirInfo() {
  return { active: isActive, name: dirPath, fallbackIdb: !isActive }
}

/** 生成唯一文件名（保留原扩展名，前端展示更友好） */
function genFileName(originalName) {
  const ext = (originalName || '').split('.').pop()?.toLowerCase()
  const safeExt = /^(png|jpe?g|gif|webp|bmp|svg|ico)$/.test(ext || '') ? ext : 'png'
  return 'sim_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.' + safeExt
}

/** 保存一张图片：优先写入本地目录（Tauri），否则存 IndexedDB；返回存储文件名 */
export async function saveSimImage(file) {
  const safeName = genFileName(file.name || 'image.png')
  if (isActive && isTauriRuntime()) {
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      await mkdir(dirPath, { recursive: true })
      await writeFile(dirPath.replace(/[\\/]+$/, '') + '/' + safeName, buf)
      return safeName
    } catch (e) {
      console.warn('[simImageStorage] 写盘失败，回退 IndexedDB:', e)
    }
  }
  await saveBlobToDB(safeName, file)
  return safeName
}

/** 读取图片，返回 Blob URL（展示用）；返回 null 表示不存在 */
export async function openSimImage(fileName) {
  if (!fileName) return null
  if (isActive && isTauriRuntime()) {
    try {
      const buf = await readFile(dirPath.replace(/[\\/]+$/, '') + '/' + fileName)
      const blob = new Blob([buf])
      return URL.createObjectURL(blob)
    } catch (e) {
      console.warn('[simImageStorage] 从目录读取失败，尝试 IndexedDB:', e)
    }
  }
  const blob = await loadBlobFromDB(fileName)
  if (blob) return URL.createObjectURL(blob)
  return null
}

/** 判断图片是否存在 */
export async function simImageExists(fileName) {
  if (!fileName) return false
  if (isActive && isTauriRuntime()) {
    try { return await exists(dirPath.replace(/[\\/]+$/, '') + '/' + fileName) } catch { /* 继续检查 IDB */ }
  }
  return !!(await loadBlobFromDB(fileName))
}

/** 删除图片（目录与 IndexedDB 一并清理） */
export async function deleteSimImage(fileName) {
  if (!fileName) return
  if (isActive && isTauriRuntime()) {
    try { await remove(dirPath.replace(/[\\/]+$/, '') + '/' + fileName) } catch { /* 忽略缺失 */ }
  }
  await deleteBlobFromDB(fileName)
}

/** 批量删除图片 */
export async function deleteSimImages(fileNames) {
  if (!Array.isArray(fileNames) || !fileNames.length) return
  for (const n of fileNames) {
    try { await deleteSimImage(n) } catch { /* 单个失败不阻塞 */ }
  }
}

/** 导出 Tauri 判断 */
export { isTauriRuntime }