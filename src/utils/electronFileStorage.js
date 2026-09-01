/**
 * Electron 原生文件存储
 *
 * 完全替代 fileStorage.js 在 Electron 环境下的实现。
 * 使用 dialog.showOpenDialog (IPC) + Node.js fs。
 * 导出的函数签名与 fileStorage.js 完全一致。
 */

import { save as _localSave, load as _localLoad } from './storage'

const DATA_DIR = 'data'
const ATTACHMENTS_DIR = 'attachments'
const BACKUPS_DIR = 'backups'
const EXPORTS_DIR = 'exports'
const META_FILE = 'meta.json'
const APP_VERSION_TAG = '5.0.142'
const FILE_PREFIX = 'mw_'

const FOLDER_KEY = 'electron_storage_folder'
const BACKUP_KEY = 'electron_backup_folder'

// ---- helpers ----

function _isElectron() {
  return !!(window.electronAPI && window.electronAPI.isElectron)
}
function _api() { return window.electronAPI }

function _join(...parts) {
  return parts.join('/').replace(/\/+/g, '/')
}

// ---- 公开 API ----

export function isFileSystemAccessSupported() {
  return _isElectron()
}

export function isFileStorageActive() {
  if (!_isElectron()) return false
  const folder = _localLoad(FOLDER_KEY)
  return !!folder
}

export function needsRegrant() {
  return false // Electron 不需要权限恢复
}

export function getFolderName() {
  const p = _localLoad(FOLDER_KEY) || ''
  if (!p) return ''
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || p
}

export function getBaseDirHandle() {
  return null // Electron 没有 handle 概念
}

export async function initFileStorage() {
  if (!_isElectron()) return 'inactive'
  const folder = _localLoad(FOLDER_KEY)
  if (!folder) return 'inactive'
  const info = await _api().fileInfo(folder)
  if (!info.ok || !info.exists) {
    _localSave(FOLDER_KEY, null)
    return 'inactive'
  }
  await _ensureDirs(folder)
  await _writeMeta(folder)
  return 'active'
}

export async function regrantPermission() {
  return true // Electron 下总是有权限
}

export async function selectStorageFolder() {
  if (!_isElectron()) throw new Error('非 Electron 环境')
  const folderPath = await _api().selectFolder()
  if (!folderPath) return null
  _localSave(FOLDER_KEY, folderPath)
  await _ensureDirs(folderPath)
  await _writeMeta(folderPath)
  return folderPath
}

export async function clearStorageFolder() {
  _localSave(FOLDER_KEY, null)
}

async function _ensureDirs(base) {
  const api = _api()
  for (const d of [DATA_DIR, ATTACHMENTS_DIR, BACKUPS_DIR, EXPORTS_DIR]) {
    await api.ensureDir(_join(base, d))
  }
}

async function _writeMeta(base) {
  const api = _api()
  await api.writeFile(_join(base, META_FILE), JSON.stringify({
    app: '硕士工作台',
    version: APP_VERSION_TAG,
    lastSync: new Date().toISOString(),
    storageVersion: 2,
  }, null, 2))
}

function _dataPath() {
  const base = _localLoad(FOLDER_KEY)
  if (!base) throw new Error('未选择存储文件夹')
  return _join(base, DATA_DIR)
}

export async function fileRead(key) {
  const folder = _localLoad(FOLDER_KEY)
  if (!folder) return null
  const api = _api()
  const dp = await _dataPath()
  const filePath = _join(dp, FILE_PREFIX + key + '.json')
  const r = await api.readFile(filePath)
  if (!r.ok) return null
  try { return JSON.parse(r.content) } catch { return null }
}

export async function fileWrite(key, value) {
  const folder = _localLoad(FOLDER_KEY)
  if (!folder) throw new Error('未选择存储文件夹')
  const api = _api()
  const dp = await _dataPath()
  const filePath = _join(dp, FILE_PREFIX + key + '.json')
  const r = await api.writeFile(filePath, JSON.stringify(value, null, 2))
  if (!r.ok) throw new Error(r.error)
  const base = _localLoad(FOLDER_KEY)
  if (base) await _writeMeta(base)
  return true
}

export async function fileReadAll() {
  const folder = _localLoad(FOLDER_KEY)
  if (!folder) return {}
  const api = _api()
  const dp = await _dataPath()
  const r = await api.listDir(dp)
  if (!r.ok) return {}
  const data = {}
  for (const f of r.files) {
    if (f.name.startsWith(FILE_PREFIX) && f.name.endsWith('.json')) {
      const key = f.name.slice(FILE_PREFIX.length, -5)
      const fr = await api.readFile(_join(dp, f.name))
      if (fr.ok) {
        try { data[key] = JSON.parse(fr.content) } catch {}
      }
    }
  }
  return data
}

export async function listStorageFiles() {
  const folder = _localLoad(FOLDER_KEY)
  if (!folder) return []
  const api = _api()
  const dp = await _dataPath()
  const r = await api.listDir(dp)
  if (!r.ok) return []
  return r.files
    .filter(f => f.name.startsWith(FILE_PREFIX) && f.name.endsWith('.json'))
    .map(f => ({ name: f.name, type: 'JSON 数据文件', size: f.size, lastModified: f.lastModified, key: f.name.slice(FILE_PREFIX.length, -5) }))
    .sort((a, b) => b.lastModified - a.lastModified)
}

export async function fileWriteAll(data) {
  const folder = _localLoad(FOLDER_KEY)
  if (!folder) throw new Error('未选择存储文件夹')
  const api = _api()
  const dp = await _dataPath()
  const r = await api.listDir(dp)
  if (r.ok) {
    for (const f of r.files) {
      if (f.name.startsWith(FILE_PREFIX)) {
        await api.removeFile(_join(dp, f.name))
      }
    }
  }
  for (const [key, value] of Object.entries(data)) {
    if (value != null) await fileWrite(key, value)
  }
}

export async function getAttachmentDirHandle() {
  const base = _localLoad(FOLDER_KEY)
  if (!base) throw new Error('未选择存储文件夹')
  return _join(base, ATTACHMENTS_DIR)
}

// ---- 备份功能 ----

let _backupLastTime = 0

export function isBackupActive() {
  return !!_localLoad(BACKUP_KEY)
}

export function getBackupFolderName() {
  const p = _localLoad(BACKUP_KEY) || ''
  if (!p) return ''
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || p
}

export async function initBackupStorage() {
  if (!_isElectron()) return 'inactive'
  const p = _localLoad(BACKUP_KEY)
  return p ? 'active' : 'inactive'
}

export async function selectBackupFolder() {
  if (!_isElectron()) throw new Error('非 Electron 环境')
  const folderPath = await _api().selectFolder()
  if (!folderPath) return null
  _localSave(BACKUP_KEY, folderPath)
  return folderPath
}

export async function clearBackupFolder() {
  _localSave(BACKUP_KEY, null)
}

export async function regrantBackupPermission() {
  return true
}

export async function writeAutoBackup(data) {
  const bp = _localLoad(BACKUP_KEY)
  if (!bp) return false
  const now = Date.now()
  if (now - _backupLastTime < 30000) return false
  _backupLastTime = now
  const api = _api()
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fn = `auto_backup_${ts}.json`
  const fp = _join(bp, fn)
  const r = await api.writeFile(fp, JSON.stringify({ app: '硕士工作台', version: APP_VERSION_TAG, exportedAt: new Date().toISOString(), dataCount: Object.keys(data).length, data }, null, 2))
  if (r.ok) {
    // 清理旧备份
    const lr = await api.listDir(bp)
    if (lr.ok) {
      const entries = lr.files
        .filter(f => f.name.startsWith('auto_backup_') && f.name.endsWith('.json'))
        .sort((a, b) => b.lastModified - a.lastModified)
      for (let i = 20; i < entries.length; i++) {
        await api.removeFile(_join(bp, entries[i].name))
      }
    }
  }
  return r.ok
}
