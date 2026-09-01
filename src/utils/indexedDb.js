/**
 * IndexedDB 存储后端 — PWA 大容量主存储
 *
 * 为什么需要它：
 * - 浏览器 localStorage 只有约 5MB，数据多了会 QuotaExceeded 写入失败
 * - IndexedDB 容量可达数百 MB ~ GB，纯前端技术、不需要后端
 *
 * 设计：
 * - 数据库 mw_workbench，对象仓库 kv（key = "mw_<key>"，value = JSON 序列化字符串）
 * - 与 localStorage 键名完全一致，可双向迁移
 * - 所有 API 均为异步，任何失败静默降级（不影响 localStorage 主流程）
 */

const DB_NAME = 'mw_workbench'
const STORE = 'kv'
const DB_VERSION = 1

let _dbPromise = null

/** 打开数据库（懒加载，单例） */
function openDB() {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') {
        console.warn('[idb] 当前环境不支持 IndexedDB，降级为 localStorage')
        return resolve(null)
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        console.warn('[idb] 打开数据库失败，降级为 localStorage')
        resolve(null)
      }
      req.onblocked = () => resolve(null)
    } catch (e) {
      console.warn('[idb] open failed:', e)
      resolve(null)
    }
  })
  return _dbPromise
}

/** 获取对象仓库（读写事务） */
async function store(mode) {
  const db = await openDB()
  if (!db) return null
  try {
    return db.transaction(STORE, mode).objectStore(STORE)
  } catch (e) {
    console.warn('[idb] 获取对象仓库失败:', e)
    return null
  }
}

/** 读取单个键（key 为完整键名，如 mw_xxx） */
export async function idbGet(key) {
  try {
    const s = await store('readonly')
    if (!s) return null
    return await new Promise(resolve => {
      const req = s.get(key)
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null)
      req.onerror = () => resolve(null)
    })
  } catch (e) {
    console.warn('[idb] get failed:', key, e)
    return null
  }
}

/** 写入单个键 */
export async function idbSet(key, value) {
  try {
    const s = await store('readwrite')
    if (!s) return false
    return await new Promise(resolve => {
      const req = s.put(value, key)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch (e) {
    console.warn('[idb] set failed:', key, e)
    return false
  }
}

/** 删除单个键 */
export async function idbRemove(key) {
  try {
    const s = await store('readwrite')
    if (!s) return false
    return await new Promise(resolve => {
      const req = s.delete(key)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch (e) {
    console.warn('[idb] remove failed:', key, e)
    return false
  }
}

/** 清空全部数据 */
export async function idbClear() {
  try {
    const s = await store('readwrite')
    if (!s) return false
    return await new Promise(resolve => {
      const req = s.clear()
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch (e) {
    console.warn('[idb] clear failed:', e)
    return false
  }
}

/** 导出全部键值对（{ 完整键名: 字符串值 }） */
export async function idbExportAll() {
  try {
    const s = await store('readonly')
    if (!s) return {}
    return await new Promise(resolve => {
      const req = s.getAll()
      const keyReq = s.getAllKeys()
      let values = null
      let keys = null
      const done = () => {
        if (values !== null && keys !== null) {
          const out = {}
          keys.forEach((k, i) => { out[k] = values[i] })
          resolve(out)
        }
      }
      req.onsuccess = () => { values = req.result || []; done() }
      req.onerror = () => resolve({})
      keyReq.onsuccess = () => { keys = keyReq.result || []; done() }
      keyReq.onerror = () => resolve({})
    })
  } catch (e) {
    console.warn('[idb] exportAll failed:', e)
    return {}
  }
}

/** 统计：键数量 + 总字节数（设置页展示用） */
export async function idbStats() {
  try {
    const all = await idbExportAll()
    let bytes = 0
    for (const v of Object.values(all)) {
      bytes += (typeof v === 'string' ? v.length : JSON.stringify(v).length) * 2
    }
    return { count: Object.keys(all).length, bytes }
  } catch {
    return { count: 0, bytes: 0 }
  }
}
