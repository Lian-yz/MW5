import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import AppIcon from './components/AppIcon.vue'
import router from './router'
import './styles/global.css'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import { initIndexedDBStorage } from './utils/storage'
window.katex = katex

// 全局弹窗双击关闭辅助函数
window.__mwDblClose = function(e, closeFn) {
  if (!e || !e.target) return
  const el = e.currentTarget
  if (el.__mwClicked) {
    closeFn()
    el.__mwClicked = false
  } else {
    el.__mwClicked = true
    setTimeout(() => { if (el) el.__mwClicked = false }, 500)
  }
}

async function bootstrap() {
  // PWA：挂载前合并 IndexedDB 大容量存储与 localStorage 缓存
  // （恢复被浏览器清掉 / 超出 5MB 写不进的完整数据）
  try {
    const r = await initIndexedDBStorage()
    if ((r.migrated || r.restored) && window.__mwLog) {
      console.log(`[storage] IndexedDB 合并完成: 迁入 ${r.migrated}, 恢复 ${r.restored}`)
    }
  } catch (e) {
    console.warn('[storage] IndexedDB 初始化失败，继续使用 localStorage:', e)
  }

  const app = createApp(App)
  app.component('AppIcon', AppIcon)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()

// 注册 Service Worker（仅生产构建 + 安全上下文 https/localhost + 非桌面版）
// 提供离线缓存：断网也能打开平台，数据都在本地 IndexedDB
// 桌面版（Tauri）无需注册：文件已在本地，且 WebView2 自定义协议下 SW 会拦截 fetch 导致「离线模式暂不可用」
const isDesktopRuntime = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__
if (isDesktopRuntime) {
  // 桌面版：主动注销残留的 Service Worker，避免其拦截本地资源请求
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister())
      }).catch(e => console.warn('[sw] 注销失败:', e))
    }
  })
} else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => {
      console.warn('[sw] Service Worker 注册失败:', e)
    })
  })
}
