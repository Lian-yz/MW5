import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// 自动导出 JSON 到本地文件系统的中间件
function autoExportPlugin() {
  const EXPORT_DIR = 'F:/AppData/WorkBuddy'
  const EXPORT_FILE = '硕士工作台_自动备份.json'

  return {
    name: 'auto-export-middleware',
    configureServer(server) {
      // POST /api/auto-export — 接收 JSON 并写入文件
      server.middlewares.use('/api/auto-export', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }))
          return
        }
        let body = ''
        req.on('data', chunk => { body += chunk.toString() })
        req.on('end', () => {
          try {
            if (!fs.existsSync(EXPORT_DIR)) {
              fs.mkdirSync(EXPORT_DIR, { recursive: true })
            }
            fs.writeFileSync(path.join(EXPORT_DIR, EXPORT_FILE), body, 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, path: path.join(EXPORT_DIR, EXPORT_FILE) }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), autoExportPlugin()],
  server: {
    port: 5173,
    open: true
  }
})
