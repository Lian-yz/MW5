/**
 * Service Worker — 硕士工作台 PWA 离线缓存
 *
 * 策略：
 * - 导航请求（打开 App）：网络优先，离线时回退到缓存的首页
 * - 静态资源（JS/CSS/字体/图片）：缓存优先，命中即返回；未命中则抓取并缓存
 * - 跨域资源、非 GET 请求：不拦截，透传
 */

const CACHE_NAME = 'mw-workbench-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 导航请求：网络优先，离线回退首页
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone()
        caches.open(CACHE_NAME).then(c => {
          c.put('/index.html', copy)
        }).catch(() => {})
        return res
      }).catch(() => {
        return caches.match('/index.html').then(cached => {
          return cached || new Response('离线模式暂不可用', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
        })
      })
    )
    return
  }

  // 静态资源：缓存优先，命中即返回；未命中抓取后缓存
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit

      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE_NAME).then(c => {
            c.put(req, copy)
          }).catch(() => {})
        }
        return res
      }).catch(() => {
        return caches.match('/index.html')
      })
    })
  )
})
