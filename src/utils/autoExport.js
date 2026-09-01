/**
 * JSON 自动导出模块
 *
 * 当使用本地文件存储时，数据已直接写入硬盘，自动导出冗余。
 * 当使用 localStorage 时，定期备份到 localStorage 备份键，并提供下载入口。
 */

import { onSave } from './storage'
import { isFileStorageActive } from './fileStorage'

const DEBOUNCE_MS = 2000
const LS_KEY = 'mw_autoExportEnabled'
const BACKUP_KEY = 'mw_auto_backup'
const STATUS_KEY = 'mw_auto_backup_status'
let timer = null

/** 收集所有 mw_* localStorage 数据 */
function collectAllData() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('mw_')) {
      data[key] = localStorage.getItem(key)
    }
  }
  return data
}

/** 执行导出 */
function doExport() {
  // 文件存储模式下，数据已在硬盘，仅更新状态
  if (isFileStorageActive()) {
    updateStatus('file', new Date().toISOString())
    return
  }

  // localStorage 模式 → 存入备份键
  const data = collectAllData()
  const exportedAt = new Date().toISOString()

  // 尝试 Vite API（本地开发环境）
  fetch('/api/auto-export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exportedAt, data }),
  })
    .then(res => {
      if (res.ok) {
        updateStatus('file', exportedAt)
      } else {
        throw new Error('API returned ' + res.status)
      }
    })
    .catch(() => {
      // API 不可用（云端），存入 localStorage
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify({ exportedAt, data }))
        updateStatus('local', exportedAt)
      } catch {
        updateStatus('error', null)
      }
    })
}

function updateStatus(mode, time) {
  localStorage.setItem(STATUS_KEY, JSON.stringify({ mode, time: time || '' }))
}

export function getBackupStatus() {
  try {
    const raw = localStorage.getItem(STATUS_KEY)
    if (!raw) return { mode: 'none', time: '' }
    return JSON.parse(raw)
  } catch {
    return { mode: 'none', time: '' }
  }
}

export function getBackupData() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function downloadBackup() {
  const backup = getBackupData()
  if (!backup) {
    // 尝试从 localStorage 直接导出
    const data = collectAllData()
    if (Object.keys(data).length === 0) {
      alert('暂无数据可导出。')
      return
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `硕士工作台_手动导出_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `硕士工作台_自动备份_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function onDataSaved() {
  if (localStorage.getItem(LS_KEY) !== 'true') return
  clearTimeout(timer)
  timer = setTimeout(doExport, DEBOUNCE_MS)
}

export function initAutoExport() {
  onSave(onDataSaved)
}
