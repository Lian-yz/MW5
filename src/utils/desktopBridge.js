/**
 * 桌面版桥接工具
 *
 * 在 Tauri 桌面环境中，浏览器的 window.open / window.print 等行为受限，
 * 需要用原生能力替代。本模块统一封装桌面版与浏览器版的差异。
 */

import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from './tauriFs'

/**
 * 用系统默认程序打开文件路径或 URL
 * - Tauri：调用原生命令，PDF 用系统默认阅读器、URL 用系统默认浏览器
 * - 浏览器：window.open
 */
export async function openPath(path) {
  if (isTauriRuntime()) {
    await invoke('open_external', { path })
  } else {
    window.open(path, '_blank')
  }
}

/**
 * 用指定软件打开文件（自定义 PDF 阅读器）
 * - Tauri：调用原生命令 open_with_app
 * - 浏览器：无法直接调用本地软件，返回错误
 */
export async function openWithApp(appPath, filePath) {
  if (isTauriRuntime()) {
    await invoke('open_with_app', { appPath, filePath })
    return true
  }
  throw new Error('浏览器环境无法直接调用本地软件')
}

/**
 * 通过隐藏 iframe 打印 HTML（替代 window.open + document.write + print）
 * - 兼容浏览器和 Tauri WebView2
 */
export function printHtml(html) {
  // 注入自动打印脚本
  const printHtmlStr = html.replace('</body>',
    '<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script></body>')
  const blob = new Blob([printHtmlStr], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.src = url
  document.body.appendChild(iframe)
  // 10 秒后清理
  setTimeout(() => {
    if (iframe.parentNode) document.body.removeChild(iframe)
    URL.revokeObjectURL(url)
  }, 10000)
}

/**
 * 下载 Blob（createElement('a' + download），兼容 WebView2
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * 复制文本到剪贴板（兼容 WebView2）
 */
export async function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // WebView2 可能降级
    }
  }
  // 降级方案
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return true
  } catch {
    return false
  }
}
