/**
 * Electron preload 脚本
 *
 * 通过 contextBridge 将有限的 IPC 能力暴露给渲染进程，
 * 避免直接暴露 Node.js API，保证安全性。
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 是否运行在 Electron 环境中
  isElectron: true,

  // 弹出原生文件夹选择器，返回绝对路径或 null（用户取消）
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // 文件读写
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),

  // 目录操作
  listDir: (dirPath) => ipcRenderer.invoke('list-dir', dirPath),
  ensureDir: (dirPath) => ipcRenderer.invoke('ensure-dir', dirPath),

  // 文件操作
  removeFile: (filePath) => ipcRenderer.invoke('remove-file', filePath),
  fileInfo: (filePath) => ipcRenderer.invoke('file-info', filePath),
  copyFile: (src, dest) => ipcRenderer.invoke('copy-file', src, dest),
})
