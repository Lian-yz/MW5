<template>
  <div class="sub-center">
    <div class="sc-toolbar">
      <button class="btn btn-primary btn-sm" @click="openAdd">+ 添加订阅</button>
      <div class="sc-spacer"></div>
      <button class="btn btn-sm btn-ghost" @click="reparseAll" :disabled="refreshingAll">
        {{ refreshingAll ? '重新解析中…' : '↻ 重新解析全部' }}
      </button>
      <span class="sc-hint" v-if="lastError" :title="lastError"><AppIcon name="alert-triangle" />  {{ lastError }}</span>
    </div>

    <div v-if="!validSubscriptions.length" class="sc-empty">
      <div class="empty-state-icon"><AppIcon name="wifi" /> </div>
      <p>还没有订阅。点「添加订阅」，从知网订阅你关注的期刊，并在平台查看最新文献。</p>
      <div class="sc-step">
        <b>使用步骤：</b>
        <ol>
          <li>点「添加订阅」→ 选常用期刊自动填入 RSS 地址 → 点「复制链接」。</li>
          <li>在 <b>Zotero</b> 里「新建订阅 / 添加 feed」，粘贴该地址完成订阅。</li>
          <li>用浏览器新标签页打开该 RSS 地址，在页面空白处右键 →「查看网页源代码」，全选复制源代码里的 XML 文本。</li>
          <li>回到平台，把清单粘到「粘贴 / 上传文献清单」，或点「上传文件」选导出的 XML，保存即可在平台查看。</li>
        </ol>
      </div>
    </div>

    <div v-for="sub in validSubscriptions" :key="sub.id" class="sc-card card">
      <div class="sc-card-head">
        <div class="sc-title-wrap" @click="toggleExpand(sub)">
          <span class="sc-dot" :class="{ off: !sub.enabled }"></span>
          <span class="sc-name">{{ sub.name }}</span>
          <span class="sc-count" v-if="sub.items && sub.items.length">{{ sub.items.length }} 篇</span>
          <span class="sc-time" v-if="sub.lastFetched">{{ sub.lastFetched.slice(5, 16) }}</span>
        </div>
        <div class="sc-card-actions">
          <label class="sc-switch" :title="sub.enabled ? '已启用' : '已停用'">
            <input type="checkbox" v-model="sub.enabled" @change="subStore.updateSubscription(sub.id, { enabled: sub.enabled })" />
            <span class="sc-switch-track"></span>
          </label>
          <button class="btn btn-sm btn-ghost" @click="reparseOne(sub)" :disabled="sub._loading" :title="sub.rawContent ? '用已保存原文重新解析' : '需先在编辑里粘贴/上传原文'">
            {{ sub._loading ? '解析中…' : '↻' }}
          </button>
          <button class="btn btn-sm btn-ghost" @click="openEdit(sub)" title="编辑">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-sm btn-ghost" @click="confirmDelete(sub)" title="删除" style="color:var(--color-danger);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="sc-url" v-if="sub.url">
        <a :href="sub.url" target="_blank" rel="noopener" @click.stop>{{ sub.url }}</a>
        <span v-if="sub.category" class="sc-tag">{{ sub.category }}</span>
      </div>
      <div class="sc-err" v-if="sub._error">解析失败：{{ sub._error }}</div>

      <div v-if="expandedId === sub.id" class="sc-items">
        <div v-if="!sub.items || !sub.items.length" class="sc-noitems">
          {{ sub._loading ? '解析中…' : (sub._error ? '无数据（解析失败）' : '暂无文献，点「编辑」粘贴 / 上传原文后保存即可显示') }}
        </div>
        <a v-for="(it, i) in (sub.items || [])" :key="i" class="sc-item" :href="it.link" target="_blank" rel="noopener">
          <div class="sc-item-title">{{ it.title }}</div>
          <div class="sc-item-meta">
            <span v-if="it.author" class="sc-item-author">{{ it.author }}</span>
            <span v-if="it.date" class="sc-item-date">{{ formatDate(it.date) }}</span>
          </div>
        </a>
      </div>
    </div>

    <!-- 添加 / 编辑 -->
    <Teleport to="body">
    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal sc-modal">
        <h3 style="margin-bottom:14px;">{{ editingSub ? '编辑订阅' : '添加订阅' }}</h3>
        <div class="form-field" style="margin-bottom:10px;">
          <label class="form-label">常用期刊（点击填入）</label>
          <div class="chip-group">
            <label v-for="p in SUBSCRIPTION_PRESETS" :key="p.name" class="chip-check" :class="{ active: form.name === p.name }" @click="applyPreset(p)">
              {{ p.name }}
            </label>
          </div>
        </div>
        <div class="form-field" style="margin-bottom:10px;">
          <label class="form-label">订阅名称 <span style="color:var(--color-danger);">*</span></label>
          <input class="input" v-model="form.name" placeholder="如：汽车工程" />
        </div>
        <div class="form-field" style="margin-bottom:10px;">
          <label class="form-label">RSS / Atom 订阅地址 <span class="hint">（左侧链接给 Zotero 添加 feed；右侧「复制源代码链接」可在浏览器打开原始 XML）</span></label>
          <div style="display:flex; gap:8px;">
            <input class="input" v-model="form.url" placeholder="https://…/rss/…" style="flex:1;" />
            <button type="button" class="btn btn-ghost btn-sm" @click="copyUrl">复制 RSS 链接</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="copySourceUrl">复制源代码链接</button>
          </div>
        </div>
        <div class="form-field" style="margin-bottom:10px;">
          <label class="form-label">分类（可选）</label>
          <input class="input" v-model="form.category" placeholder="如：汽车" />
        </div>
        <div class="form-field" style="margin-bottom:6px;">
          <label class="form-label">粘贴 / 上传文献清单 <span class="hint">（必须复制浏览器「查看网页源代码」里的 XML 原文，不能复制渲染后的页面文字；或上传 Zotero 导出的 .xml/.txt）</span></label>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <button type="button" class="btn btn-ghost btn-sm" @click="pickFile">上传文件</button>
            <span class="hint" v-if="form.rawContent">已载入内容（{{ form.rawContent.length }} 字）</span>
          </div>
          <textarea class="input" v-model="form.rawContent" rows="6" placeholder="把浏览器「查看网页源代码」后的 XML 文本全文粘贴到这里…"></textarea>
          <input type="file" ref="fileInput" accept=".xml,.txt,.rss,.atom" style="display:none" @change="importXmlFile" />
        </div>
        <div class="modal-actions">
          <label class="sc-enable"><input type="checkbox" v-model="form.enabled" /> 在平台展示该订阅</label>
          <div class="modal-actions-right">
            <button class="btn btn-ghost btn-sm" @click="closeForm">取消</button>
            <button class="btn btn-primary btn-sm" @click="saveForm">{{ editingSub ? '保存' : '添加' }}</button>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSubscriptionStore, SUBSCRIPTION_PRESETS } from '../stores/index'
import { copyText } from '../utils/desktopBridge'

const subStore = useSubscriptionStore()

// 过滤无效订阅（防止导入备份后出现空对象导致渲染异常）
const validSubscriptions = computed(() =>
  (Array.isArray(subStore.subscriptions) ? subStore.subscriptions : [])
    .filter(s => s && s.id && (s.name || '').trim())
)
const showForm = ref(false)
const editingSub = ref(null)
const expandedId = ref('')
const refreshingAll = ref(false)
const lastError = ref('')
const fileInput = ref(null)
const emptyForm = () => ({ name: '', url: '', category: '', enabled: true, rawContent: '' })
const form = ref(emptyForm())

function toggleExpand(sub) { expandedId.value = expandedId.value === sub.id ? '' : sub.id }

function openAdd() {
  editingSub.value = null
  form.value = emptyForm()
  showForm.value = true
}
function openEdit(sub) {
  editingSub.value = sub
  form.value = { name: sub.name || '', url: sub.url || '', category: sub.category || '', enabled: sub.enabled !== false, rawContent: sub.rawContent || '' }
  showForm.value = true
}
function closeForm() { showForm.value = false; editingSub.value = null }
function applyPreset(p) {
  form.value.name = p.name
  if (p.url) form.value.url = p.url
}
function copyUrl() {
  const u = (form.value.url || '').trim()
  if (!u) { alert('请先填入 RSS 地址，或点击上方常用期刊自动填入'); return }
  const tip = '已复制 RSS 链接！\n\n这是给 Zotero 添加 feed 用的地址，按以下步骤操作：\n1. 在 Zotero 里「新建订阅 / 添加 feed」，粘贴此链接；\n2. 用浏览器新标签页打开此链接，在页面空白处右键 →「查看网页源代码」；\n3. 全选复制源代码里的 XML 文本；\n4. 回到这里，粘到「粘贴 / 上传文献清单」或点「上传文件」，保存即可在平台查看。'
  copyText(u).then(ok => { if (ok) alert(tip); else prompt('复制失败，请手动复制：', u) })
}
function copySourceUrl() {
  const u = (form.value.url || '').trim()
  if (!u) { alert('请先填入 RSS 地址，或点击上方常用期刊自动填入'); return }
  const src = 'view-source:' + u
  const tip = '已复制「查看网页源代码」链接！\n\n请把该链接粘贴到浏览器地址栏打开，然后 Ctrl+A 全选、Ctrl+C 复制里面的 XML 文本，再粘回平台的「粘贴 / 上传文献清单」。'
  copyText(src).then(ok => { if (ok) alert(tip); else prompt('复制失败，请手动复制：', src) })
}
function pickFile() { if (fileInput.value) fileInput.value.click() }
function importXmlFile(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => { form.value.rawContent = String(reader.result || '') }
  reader.readAsText(f, 'utf-8')
  e.target.value = ''
}
function saveForm() {
  if (!form.value.name.trim()) { alert('请填写订阅名称'); return }
  const raw = (form.value.rawContent || '').trim()
  const payload = { name: form.value.name.trim(), url: form.value.url.trim(), category: form.value.category.trim(), enabled: form.value.enabled, rawContent: raw }
  let subId = editingSub.value ? editingSub.value.id : ''
  if (editingSub.value) {
    subStore.updateSubscription(subId, payload)
  } else {
    const created = subStore.addSubscription(payload)
    subId = created.id
  }
  if (raw.length > 20) {
    try {
      const items = parseFeed(raw)
      subStore.setItems(subId, items)
      if (!items.length) alert('已导入内容，但未解析出文献条目。\n\n知网 RSS 在浏览器中会被渲染成可读页面，必须复制「查看网页源代码」里的 XML 原文，或上传 Zotero 导出的 .xml/.txt 文件。')
    } catch (e) {
      alert('解析失败：' + ((e && e.message) || '格式错误'))
    }
  }
  closeForm()
}
function confirmDelete(sub) {
  if (confirm('确定删除订阅「' + (sub.name || '未命名') + '」吗？')) subStore.deleteSubscription(sub.id)
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// ===== RSS / Atom 解析（仅解析用户粘贴 / 上传的原文，不再自动抓取） =====
function decodeHtml(s) {
  if (!s) return ''
  if (typeof document === 'undefined') return s
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value
}
function stripCdata(s) {
  if (!s) return ''
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim()
}
function pick(block, tag) {
  const m = block.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i'))
  return m ? stripCdata(m[1]).trim() : ''
}
function pickLink(block) {
  let m = block.match(/<link(?:\s[^>]*)?\s+href=["']([^"']+)["'][^>]*>/i)
  if (m) return m[1].trim()
  m = block.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i)
  if (m) return stripCdata(m[1]).trim()
  return ''
}
function pickAtomAuthor(block) {
  const m = block.match(/<author(?:\s[^>]*)?>[\s\S]*?<name(?:\s[^>]*)?>([\s\S]*?)<\/name>/i)
  return m ? stripCdata(m[1]).trim() : ''
}
function parseFeed(xml) {
  const items = []
  const text = String(xml || '').trim()
  if (!text) return items
  // RSS 2.0（兼容带属性标签、CDATA、命名空间）
  const rss = text.match(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi) || []
  if (rss.length) {
    for (const block of rss) {
      const title = pick(block, 'title')
      if (!title) continue
      const link = pickLink(block)
      const date = pick(block, 'pubDate') || pick(block, 'dc:date') || pick(block, 'date')
      const author = pick(block, 'author') || pick(block, 'dc:creator') || pick(block, 'creator')
      items.push({ title: decodeHtml(title), link, date: date.trim(), author: decodeHtml(author).trim() })
    }
    return items.slice(0, 30)
  }
  // Atom（兼容带属性标签、CDATA、命名空间）
  const atom = text.match(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi) || []
  for (const block of atom) {
    const title = pick(block, 'title')
    if (!title) continue
    const link = pickLink(block)
    const date = pick(block, 'updated') || pick(block, 'published') || pick(block, 'issued')
    const author = pickAtomAuthor(block) || pick(block, 'name')
    items.push({ title: decodeHtml(title), link, date: date.trim(), author: decodeHtml(author).trim() })
  }
  return items.slice(0, 30)
}

async function reparseOne(sub) {
  if (!sub.rawContent || sub.rawContent.trim().length < 20) {
    alert('该订阅还没有保存原文，请点「编辑」粘贴或上传 RSS 原文后再重新解析。')
    return
  }
  sub._loading = true
  sub._error = ''
  try {
    const items = parseFeed(sub.rawContent)
    subStore.setItems(sub.id, items)
    if (!items.length) sub._error = '原文解析为空（可能内容非标准 RSS/Atom）'
  } catch (e) {
    sub._error = (e && e.message) ? e.message : '格式错误'
  } finally {
    sub._loading = false
  }
}
async function reparseAll() {
  const list = subStore.subscriptions.filter(s => s.rawContent && s.rawContent.trim().length >= 20)
  if (!list.length) { alert('暂无可重新解析的订阅（请先在各订阅里粘贴 / 上传 RSS 原文）。'); return }
  refreshingAll.value = true
  lastError.value = ''
  for (const sub of list) {
    try { subStore.setItems(sub.id, parseFeed(sub.rawContent)) }
    catch (e) { sub._error = '解析失败' }
  }
  refreshingAll.value = false
}
</script>

<style scoped>
.sub-center { padding: 4px 0 20px; }
.sc-toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.sc-spacer { flex: 1; }
.sc-hint { font-size: 12px; color: #F59E0B; }
.sc-empty { text-align: center; color: var(--color-text-tertiary); padding: 48px 0; }
.sc-empty .empty-state-icon { font-size: 40px; margin-bottom: 8px; }
.sc-step { text-align: left; background: var(--color-bg); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 12px 16px; margin-top: 14px; font-size: 13px; color: var(--color-text-secondary); line-height: 1.75; max-width: 560px; margin-left: auto; margin-right: auto; }
.sc-step ol { margin: 6px 0 0; padding-left: 20px; }
.sc-step b { color: var(--color-text-primary); }

.sc-card { background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 12px; }
.sc-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sc-title-wrap { display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; min-width: 0; }
.sc-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--color-success); flex-shrink: 0; }
.sc-dot.off { background: var(--color-text-tertiary); }
.sc-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.sc-count { font-size: 12px; color: var(--color-primary); background: rgba(37,99,235,0.1); padding: 1px 8px; border-radius: 999px; }
.sc-time { font-size: 12px; color: var(--color-text-tertiary); }
.sc-card-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.sc-switch { position: relative; display: inline-flex; cursor: pointer; }
.sc-switch input { display: none; }
.sc-switch-track { width: 34px; height: 18px; border-radius: 999px; background: var(--color-border); position: relative; transition: background .15s; display: inline-block; }
.sc-switch input:checked + .sc-switch-track { background: var(--color-success); }
.sc-switch-track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform .15s; }
.sc-switch input:checked + .sc-switch-track::after { transform: translateX(16px); }

.sc-url { margin-top: 8px; font-size: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sc-url a { color: var(--color-primary); text-decoration: none; word-break: break-all; }
.sc-url a:hover { text-decoration: underline; }
.sc-tag { font-size: 11px; color: var(--color-text-secondary); background: var(--color-bg); border: 1px solid var(--color-border-light); padding: 1px 8px; border-radius: 999px; }
.sc-err { margin-top: 6px; font-size: 12px; color: var(--color-danger); }

.sc-items { margin-top: 10px; border-top: 1px dashed var(--color-border-light); padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.sc-noitems { font-size: 13px; color: var(--color-text-tertiary); padding: 8px 0; }
.sc-item { text-decoration: none; padding: 9px 10px; border-radius: var(--radius-sm, 6px); background: var(--color-bg); border: 1px solid var(--color-border-light); }
.sc-item:hover { background: var(--color-bg-hover); }
.sc-item-title { font-size: 13px; color: var(--color-text-primary); line-height: 1.4; }
.sc-item-meta { margin-top: 4px; font-size: 12px; color: var(--color-text-tertiary); display: flex; gap: 10px; }

.sc-modal { position: relative; max-width: 560px; width: 92%; background: var(--color-bg-card, #fff); border-radius: var(--radius-xl, 16px); box-shadow: var(--shadow-xl, 0 20px 50px rgba(0,0,0,0.18)); padding: 24px 28px; max-height: 85vh; overflow-y: auto; animation: scaleIn var(--transition-normal); }
textarea.input { min-height: 110px; resize: vertical; font-family: inherit; }
.modal-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; }
.modal-actions-right { display: flex; gap: 10px; margin-left: auto; }
.sc-enable { font-size: 13px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px; }
.chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-check { padding: 5px 12px; border: 1px solid var(--color-border-light); border-radius: 999px; cursor: pointer; font-size: 13px; color: var(--color-text-secondary); background: var(--color-bg); user-select: none; }
.chip-check.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
</style>
