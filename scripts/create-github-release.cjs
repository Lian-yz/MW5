const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const version = pkg.version
const tag = `v${version}`

// 从 CHANGELOG.md 提取当前版本日志
const changelogPath = path.join(root, 'CHANGELOG.md')
const changelog = fs.readFileSync(changelogPath, 'utf8')
const regex = new RegExp(`## ${tag}\\s*\\([^\\)]*\\)([\\s\\S]*?)(?=\\n## v\\d+\\.\\d+\\.\\d+\\s|\\s*$)`)
const match = changelog.match(regex)
let body = ''
if (match && match[1]) {
  body = match[1].trim()
} else {
  console.error(`未在 CHANGELOG.md 中找到 ${tag} 的日志`)
  process.exit(1)
}

// 从 git remote URL 提取 GitHub PAT
let token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
if (!token) {
  try {
    const remoteUrl = execSync('git remote get-url origin', { cwd: root, encoding: 'utf8' }).trim()
    const m = remoteUrl.match(/https:\/\/[^:@]+:([^@]+)@github\.com/)
    if (m && m[1]) token = m[1]
  } catch (e) {
    // ignore
  }
}
if (!token) {
  console.error('无法获取 GitHub Token，请设置 GITHUB_TOKEN 环境变量或在 git remote URL 中嵌入 PAT')
  process.exit(1)
}

const owner = 'Lian-yz'
const repo = 'MW5'
const releaseName = `Workbench ${version}`

const payload = JSON.stringify({
  tag_name: tag,
  name: releaseName,
  body: body,
  draft: false,
  prerelease: false,
  generate_release_notes: false,
})

const options = {
  hostname: 'api.github.com',
  path: `/repos/${owner}/${repo}/releases`,
  method: 'POST',
  headers: {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'MasterWorkbench-Release-Script',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
}

const req = https.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => { data += chunk })
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const json = JSON.parse(data)
      console.log(`✅ Release 创建成功：${json.html_url}`)
    } else if (res.statusCode === 422) {
      // 可能 release 已存在，尝试获取已有 release
      const getOptions = {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/releases/tags/${tag}`,
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'MasterWorkbench-Release-Script',
        },
      }
      const getReq = https.request(getOptions, (getRes) => {
        let getData = ''
        getRes.on('data', (chunk) => { getData += chunk })
        getRes.on('end', () => {
          if (getRes.statusCode >= 200 && getRes.statusCode < 300) {
            const json = JSON.parse(getData)
            console.log(`⚠️ Release 已存在：${json.html_url}`)
          } else {
            console.error(`❌ Release 创建失败（${res.statusCode}）：${data}`)
            process.exit(1)
          }
        })
      })
      getReq.on('error', (err) => {
        console.error('请求失败：', err.message)
        process.exit(1)
      })
      getReq.end()
    } else {
      console.error(`❌ Release 创建失败（${res.statusCode}）：${data}`)
      process.exit(1)
    }
  })
})

req.on('error', (err) => {
  console.error('请求失败：', err.message)
  process.exit(1)
})

req.write(payload)
req.end()
