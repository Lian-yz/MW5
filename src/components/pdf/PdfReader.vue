<template>
  <div class="pdf-reader-overlay" v-if="visible" @click.self="(e) => window.__mwDblClose(e, () => close())">
    <div class="pdf-reader-container">
      <!-- 顶部工具栏 -->
      <div class="pdf-toolbar">
        <div class="toolbar-left">
          <button class="tool-btn" @click="close" title="关闭">✕</button>
          <span class="toolbar-divider">|</span>
          <span class="toolbar-title" :title="fileName">{{ fileName }}</span>
        </div>
        <div class="toolbar-center">
          <button class="tool-btn" @click="zoomOut" :disabled="scale <= 0.5">−</button>
          <span class="zoom-label">{{ Math.round(scale * 100) }}%</span>
          <button class="tool-btn" @click="zoomIn" :disabled="scale >= 3">+</button>
          <span class="toolbar-divider">|</span>
          <button class="tool-btn" @click="prevPage" :disabled="currentPage <= 1">◂</button>
          <input class="page-input" type="number" :value="currentPage" @change="jumpToPage"
            :min="1" :max="totalPages" />
          <span class="page-label">/ {{ totalPages }}</span>
          <button class="tool-btn" @click="nextPage" :disabled="currentPage >= totalPages">▸</button>
        </div>
        <div class="toolbar-right">
          <button class="tool-btn" :class="{ active: translateMode }" @click="translateMode = !translateMode"
            title="翻译开关"><AppIcon name="globe" /> </button>
          <button class="tool-btn" :class="{ active: annotateMode }" @click="annotateMode = !annotateMode"
            title="批注开关"><AppIcon name="pencil" /> </button>
          <button class="tool-btn" @click="toggleAnnotations" :class="{ active: showAnnotations }"
            title="显示/隐藏批注"><AppIcon name="eye" /> </button>
          <span class="toolbar-divider">|</span>
          <button class="tool-btn" @click="downloadPdf" title="下载"><AppIcon name="arrow-down" /> </button>
          <button class="tool-btn" @click="openExternal" title="外部浏览器打开"><AppIcon name="link" /> </button>
        </div>
      </div>

      <div class="pdf-body">
        <!-- 左侧缩略图 -->
        <div class="pdf-thumbnails" ref="thumbnailRef">
          <div v-for="pageNum in totalPages" :key="'thumb-' + pageNum"
            class="thumb-item"
            :class="{ active: currentPage === pageNum }"
            @click="goToPage(pageNum)">
            <canvas :ref="el => setThumbCanvasRef(pageNum, el)" class="thumb-canvas"></canvas>
            <span class="thumb-page-num">{{ pageNum }}</span>
          </div>
        </div>

        <!-- PDF 内容区 -->
        <div class="pdf-content" ref="contentRef" @scroll="onScroll">
          <div class="pdf-pages-wrapper">
            <div v-for="pageNum in visiblePages" :key="pageNum"
              class="pdf-page-container"
              :ref="el => setPageRef(pageNum, el)"
              :data-page="pageNum">
              <div class="pdf-page-inner" :style="{ width: baseWidth * scale + 'px' }">
                <canvas :ref="el => setCanvasRef(pageNum, el)" class="pdf-canvas"></canvas>
                <div class="pdf-text-layer" v-if="pageTexts[pageNum]"
                  :style="{ width: baseWidth * scale + 'px', height: pageHeights[pageNum] * scale + 'px' }">
                  <span v-for="(item, idx) in pageTexts[pageNum]" :key="idx"
                    class="text-span"
                    :style="getTextStyle(item, scale)"
                    :data-text-idx="idx">{{ item.str }}</span>
                </div>
                <!-- 批注 SVG 层 -->
                <svg v-if="showAnnotations && pageAnnotations[pageNum]?.length" class="pdf-annot-layer"
                  :style="{ width: baseWidth * scale + 'px', height: pageHeights[pageNum] * scale + 'px' }"
                  :viewBox="`0 0 ${baseWidth} ${pageHeights[pageNum]}`">
                  <g v-for="(ann, ai) in pageAnnotations[pageNum]" :key="ai">
                    <g v-if="ann.type === 'highlight'" class="annot-item deletable"
                      @contextmenu.prevent="showDeleteMenu($event, ann)">
                      <rect :x="ann.x" :y="ann.y" :width="ann.w" :height="ann.h"
                        fill="rgba(255, 235, 59, 0.35)" rx="2" />
                    </g>
                    <g v-if="ann.type === 'underline'" class="annot-item deletable"
                      @contextmenu.prevent="showDeleteMenu($event, ann)">
                      <line :x1="ann.x" :y1="ann.y + ann.h + 1" :x2="ann.x + ann.w" :y2="ann.y + ann.h + 1"
                        stroke="#F44336" stroke-width="2" />
                    </g>
                    <g v-if="ann.type === 'strikethrough'" class="annot-item deletable"
                      @contextmenu.prevent="showDeleteMenu($event, ann)">
                      <line :x1="ann.x" :y1="ann.y + ann.h / 2" :x2="ann.x + ann.w" :y2="ann.y + ann.h / 2"
                        stroke="#666" stroke-width="1.5" stroke-dasharray="4,2" />
                    </g>
                    <g v-if="ann.type === 'note'" @click="showNoteDetail(ann)" style="cursor:pointer">
                      <rect :x="ann.x" :y="ann.y - 2" :width="16" :height="16" rx="3" fill="#FF9800" />
                      <text :x="ann.x + 8" :y="ann.y + 11" text-anchor="middle" fill="#fff" font-size="11"><AppIcon name="pin" /> </text>
                    </g>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 选中文本后的操作浮窗 -->
      <div v-if="selectionMenu.show" class="selection-popup"
        :style="{ top: selectionMenu.y + 'px', left: selectionMenu.x + 'px' }">
        <div class="selection-actions">
          <button class="selection-btn highlight" @click="addAnnotFromSelection('highlight')"><AppIcon name="pencil" />  高亮</button>
          <button class="selection-btn underline" @click="addAnnotFromSelection('underline')">U̲ 下划线</button>
          <button class="selection-btn strike" @click="addAnnotFromSelection('strikethrough')">S̶ 删除线</button>
          <button class="selection-btn note" @click="addNoteFromSelection"><AppIcon name="pin" />  便签</button>
        </div>
      </div>

      <!-- 翻译浮窗 -->
      <div v-if="translation.show" class="translate-popup"
        :style="{ top: translation.y + 'px', left: translation.x + 'px' }">
        <div class="translate-header">
          <span><AppIcon name="globe" />  翻译</span>
          <button class="close-btn" @click="translation.show = false">✕</button>
        </div>
        <div class="translate-original">{{ translation.original }}</div>
        <div class="translate-result" v-if="translation.loading">翻译中...</div>
        <div class="translate-result" v-else>{{ translation.result || '翻译失败，请重试' }}</div>
      </div>

      <!-- 删除批注右键菜单 -->
      <div v-if="deleteMenu.show" class="context-menu"
        :style="{ top: deleteMenu.y + 'px', left: deleteMenu.x + 'px' }">
        <button class="context-item" @click="deleteAnnotation(deleteMenu.annotation)"><AppIcon name="trash" />  删除批注</button>
        <button class="context-item" @click="deleteMenu.show = false">取消</button>
      </div>

      <!-- 便签详情弹窗 -->
      <div v-if="noteDetail.show" class="note-detail-popup">
        <div class="note-detail-header">
          <span><AppIcon name="pin" />  便签</span>
          <button class="close-btn" @click="noteDetail.show = false">✕</button>
        </div>
        <textarea class="note-detail-textarea" v-model="noteDetail.text" rows="4"
          placeholder="输入笔记内容..."></textarea>
        <div class="note-detail-actions">
          <button class="btn btn-sm btn-ghost" @click="deleteNoteAnnotation">删除</button>
          <button class="btn btn-sm btn-primary" @click="saveNoteAnnotation">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { load, save } from '../../utils/storage'
import { openPath, downloadBlob } from '../../utils/desktopBridge'

const props = defineProps({
  visible: { type: Boolean, default: false },
  pdfUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  paperId: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const ANNOT_KEY = 'mw_pdf_annotations'
const THUMB_SCALE = 0.18

// ===== 状态 =====
const contentRef = ref(null)
const thumbnailRef = ref(null)
const scale = ref(1.4)
const currentPage = ref(1)
const totalPages = ref(0)
const baseWidth = ref(800)
const pageHeights = reactive({})
const pageTexts = reactive({})
const pageRefs = reactive({})
const canvasRefs = reactive({})
const thumbCanvasRefs = reactive({})
const renderedPages = reactive({})
const renderedThumbs = reactive({})
const translateMode = ref(false)
const annotateMode = ref(false)
const showAnnotations = ref(true)
const allAnnotations = ref([])
const noteDetail = reactive({ show: false, annotation: null, text: '' })

const selectionMenu = reactive({ show: false, x: 0, y: 0 })
const translation = reactive({
  show: false, x: 0, y: 0,
  original: '', result: '', loading: false
})
const deleteMenu = reactive({ show: false, x: 0, y: 0, annotation: null })

let pdfDoc = null
let pendingSelection = null

// ===== 可见页面（仅渲染当前页附近） =====
const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 1)
  const end = Math.min(totalPages.value, currentPage.value + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// ===== 按页面分组的批注 =====
const pageAnnotations = computed(() => {
  const map = {}
  for (const ann of allAnnotations.value) {
    if (!map[ann.page]) map[ann.page] = []
    map[ann.page].push(ann)
  }
  return map
})

// ===== 加载批注 =====
function loadAnnotations() {
  if (!props.paperId) return
  const all = load(ANNOT_KEY, {})
  allAnnotations.value = all[props.paperId] || []
}

function saveAnnotations() {
  if (!props.paperId) return
  const all = load(ANNOT_KEY, {})
  all[props.paperId] = allAnnotations.value
  save(ANNOT_KEY, all)
}

// ===== 初始化 PDF =====
async function initPdf() {
  if (!props.pdfUrl || !props.visible) return
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = resolve
      script.onerror = () => reject(new Error('PDF.js 加载失败'))
      document.head.appendChild(script)
    })
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }

  try {
    pdfDoc = await window.pdfjsLib.getDocument(props.pdfUrl).promise
    totalPages.value = pdfDoc.numPages
    currentPage.value = 1
    loadAnnotations()
    await nextTick()
    renderCurrentPages()
    renderAllThumbnails()
  } catch (e) {
    console.error('PDF 加载失败:', e)
    alert('PDF 加载失败：' + (e.message || '未知错误'))
  }
}

// ===== 渲染页面 =====
async function renderPage(pageNum) {
  if (!pdfDoc || renderedPages[pageNum]) return
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale: 1 })
  baseWidth.value = viewport.width
  pageHeights[pageNum] = viewport.height

  // 提取文本
  try {
    const textContent = await page.getTextContent()
    pageTexts[pageNum] = textContent.items
      .filter(item => item.str.trim())
      .map(item => ({
        str: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        w: item.width,
        h: item.height,
        fontName: item.fontName,
      }))
  } catch { pageTexts[pageNum] = [] }

  await nextTick()
  const canvas = canvasRefs[pageNum]
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const scaledViewport = page.getViewport({ scale: scale.value * 2 })
  canvas.width = scaledViewport.width
  canvas.height = scaledViewport.height
  canvas.style.width = (baseWidth.value * scale.value) + 'px'
  canvas.style.height = (pageHeights[pageNum] * scale.value) + 'px'

  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
  renderedPages[pageNum] = true
}

async function renderCurrentPages() {
  for (const p of visiblePages.value) {
    await renderPage(p)
  }
}

// ===== 缩略图 =====
async function renderThumbnail(pageNum) {
  if (!pdfDoc || renderedThumbs[pageNum]) return
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale: THUMB_SCALE })
  await nextTick()
  const canvas = thumbCanvasRefs[pageNum]
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: ctx, viewport }).promise
  renderedThumbs[pageNum] = true
}

function renderAllThumbnails() {
  for (let i = 1; i <= totalPages.value; i++) {
    renderThumbnail(i)
  }
}

// ===== 缩放 =====
function zoomIn() { scale.value = Math.min(3, scale.value + 0.1); reRenderAll() }
function zoomOut() { scale.value = Math.max(0.5, scale.value - 0.1); reRenderAll() }

function reRenderAll() {
  for (const key of Object.keys(renderedPages)) delete renderedPages[key]
  nextTick(() => renderCurrentPages())
}

// ===== 页面导航 =====
function prevPage() { if (currentPage.value > 1) { currentPage.value--; scrollToPage() } }
function nextPage() { if (currentPage.value < totalPages.value) { currentPage.value++; scrollToPage() } }

function jumpToPage(e) {
  const v = parseInt(e.target.value)
  if (v >= 1 && v <= totalPages.value) goToPage(v)
}

function goToPage(pageNum) {
  currentPage.value = pageNum
  scrollToPage()
}

function scrollToPage() {
  nextTick(() => {
    const el = pageRefs[currentPage.value]
    if (el && contentRef.value) {
      contentRef.value.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' })
    }
    renderCurrentPages()
    // 同步缩略图滚动
    const thumb = thumbnailRef.value?.querySelector(`.thumb-item:nth-child(${currentPage.value})`)
    if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function onScroll() {
  const container = contentRef.value
  if (!container) return
  const scrollTop = container.scrollTop
  let closestPage = 1
  let minDist = Infinity
  for (let i = 1; i <= totalPages.value; i++) {
    const el = pageRefs[i]
    if (!el) continue
    const dist = Math.abs(el.offsetTop - scrollTop)
    if (dist < minDist) { minDist = dist; closestPage = i }
  }
  if (closestPage !== currentPage.value) {
    currentPage.value = closestPage
  }
}

// ===== 文本选择：翻译 / 批注菜单 =====
function setupMouseEvents() {
  document.addEventListener('mouseup', handleGlobalMouseUp)
  document.addEventListener('mousedown', handleGlobalMouseDown)
}

function handleGlobalMouseDown(e) {
  // 点击浮窗外关闭菜单
  const isInsideSelectionPopup = e.target.closest('.selection-popup')
  const isInsideDeleteMenu = e.target.closest('.context-menu')
  if (!isInsideSelectionPopup) selectionMenu.show = false
  if (!isInsideDeleteMenu) deleteMenu.show = false
}

function handleGlobalMouseUp(e) {
  if (!props.visible) return
  // 若点击在工具栏或缩略图，忽略
  if (e.target.closest('.pdf-toolbar') || e.target.closest('.pdf-thumbnails')) return

  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return
  const text = selection.toString().trim()
  if (!text || text.length < 2) return

  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  if (translateMode.value) {
    // 翻译模式
    if (!/[a-zA-Z]/.test(text)) return
    translation.x = rect.left + rect.width / 2 - 150
    translation.y = rect.bottom + 10
    onTranslate(text)
    return
  }

  if (annotateMode.value) {
    // 批注模式：记录选区，显示操作菜单
    pendingSelection = { range, text }
    selectionMenu.x = rect.left + rect.width / 2 - 120
    selectionMenu.y = rect.bottom + 10
    selectionMenu.show = true
  }
}

// ===== 添加批注 =====
function addAnnotFromSelection(type) {
  if (!pendingSelection) return
  const { range, text } = pendingSelection
  const rects = range.getClientRects()
  if (!rects.length) return

  const pageEl = range.commonAncestorContainer.parentElement?.closest('.pdf-page-inner')
  if (!pageEl) return
  const containerRect = pageEl.getBoundingClientRect()
  const pageNum = parseInt(pageEl.closest('.pdf-page-container').dataset.page)

  const annId = 'ann_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
  for (const rect of rects) {
    allAnnotations.value.push({
      id: annId, page: pageNum, type,
      x: (rect.left - containerRect.left) / scale.value,
      y: (rect.top - containerRect.top) / scale.value,
      w: rect.width / scale.value,
      h: rect.height / scale.value,
      text, noteText: ''
    })
  }
  saveAnnotations()
  selectionMenu.show = false
  window.getSelection().removeAllRanges()
  pendingSelection = null
}

function addNoteFromSelection() {
  if (!pendingSelection) return
  const noteText = prompt('请输入便签内容：')
  if (!noteText) return

  const { range, text } = pendingSelection
  const rects = range.getClientRects()
  if (!rects.length) return
  const rect = rects[0]
  const pageEl = range.commonAncestorContainer.parentElement?.closest('.pdf-page-inner')
  if (!pageEl) return
  const containerRect = pageEl.getBoundingClientRect()
  const pageNum = parseInt(pageEl.closest('.pdf-page-container').dataset.page)

  allAnnotations.value.push({
    id: 'ann_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    page: pageNum, type: 'note',
    x: (rect.left - containerRect.left) / scale.value,
    y: (rect.top - containerRect.top) / scale.value,
    w: 16, h: 16,
    text, noteText
  })
  saveAnnotations()
  selectionMenu.show = false
  window.getSelection().removeAllRanges()
  pendingSelection = null
}

function toggleAnnotations() {
  showAnnotations.value = !showAnnotations.value
}

// ===== 删除批注 =====
function showDeleteMenu(e, ann) {
  deleteMenu.x = e.clientX
  deleteMenu.y = e.clientY
  deleteMenu.annotation = ann
  deleteMenu.show = true
}

function deleteAnnotation(ann) {
  if (!ann) return
  allAnnotations.value = allAnnotations.value.filter(a => a.id !== ann.id)
  saveAnnotations()
  deleteMenu.show = false
}

// ===== 翻译 =====
async function onTranslate(text) {
  translation.show = true
  translation.original = text
  translation.result = ''
  translation.loading = true
  try {
    const resp = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`
    )
    const data = await resp.json()
    translation.result = data.responseData?.translatedText || '翻译失败'
  } catch {
    translation.result = '翻译服务暂不可用'
  }
  translation.loading = false
}

// ===== 便签详情 =====
function showNoteDetail(ann) {
  noteDetail.show = true
  noteDetail.annotation = ann
  noteDetail.text = ann.noteText || ''
}

function saveNoteAnnotation() {
  if (noteDetail.annotation) {
    noteDetail.annotation.noteText = noteDetail.text
    saveAnnotations()
  }
  noteDetail.show = false
}

function deleteNoteAnnotation() {
  if (noteDetail.annotation) {
    deleteAnnotation(noteDetail.annotation)
  }
  noteDetail.show = false
}

// ===== 下载 / 外部打开 =====
async function downloadPdf() {
  const blob = await fetch(props.pdfUrl).then(r => r.blob())
  downloadBlob(blob, props.fileName)
}

function openExternal() {
  openPath(props.pdfUrl)
}

// ===== 关闭 =====
function close() {
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  document.removeEventListener('mousedown', handleGlobalMouseDown)
  emit('close')
}

function getTextStyle(item, s) {
  return {
    left: item.x * s + 'px',
    top: (item.y - item.h) * s + 'px',
    width: item.w * s + 'px',
    height: item.h * s + 'px',
    fontSize: item.h * s * 0.85 + 'px',
  }
}

function setPageRef(pageNum, el) { if (el) pageRefs[pageNum] = el }
function setCanvasRef(pageNum, el) { if (el) canvasRefs[pageNum] = el }
function setThumbCanvasRef(pageNum, el) { if (el) thumbCanvasRefs[pageNum] = el }

// ===== 生命周期 =====
watch(() => props.visible, async (v) => {
  if (v) {
    setupMouseEvents()
    await nextTick()
    initPdf()
  } else {
    document.removeEventListener('mouseup', handleGlobalMouseUp)
    document.removeEventListener('mousedown', handleGlobalMouseDown)
    pdfDoc = null
    for (const key of Object.keys(renderedPages)) delete renderedPages[key]
    for (const key of Object.keys(renderedThumbs)) delete renderedThumbs[key]
    for (const key of Object.keys(pageTexts)) delete pageTexts[key]
    allAnnotations.value = []
    selectionMenu.show = false
    translation.show = false
    deleteMenu.show = false
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  document.removeEventListener('mousedown', handleGlobalMouseDown)
})
</script>

<style scoped>
.pdf-reader-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: stretch; justify-content: stretch;
}
.pdf-reader-container {
  display: flex; flex-direction: column;
  width: 100%; height: 100%;
  background: #525659;
}

/* 工具栏 */
.pdf-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 16px;
  background: #323639; color: #e0e0e0;
  min-height: 44px; flex-shrink: 0;
  gap: 8px;
}
.toolbar-left, .toolbar-center, .toolbar-right {
  display: flex; align-items: center; gap: 6px;
}
.toolbar-title {
  font-size: 13px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.toolbar-divider {
  color: #555; margin: 0 2px;
}
.tool-btn {
  background: none; border: none; color: #ccc; cursor: pointer;
  padding: 4px 8px; border-radius: 4px; font-size: 14px;
  transition: all 0.15s;
}
.tool-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
.tool-btn:disabled { opacity: 0.35; cursor: default; }
.tool-btn.active { background: rgba(66,133,244,0.35); color: #8ab4f8; }
.zoom-label { font-size: 13px; min-width: 42px; text-align: center; }
.page-input {
  width: 42px; text-align: center; background: #424242; border: 1px solid #555;
  color: #eee; border-radius: 3px; padding: 2px 4px; font-size: 13px;
}
.page-label { font-size: 13px; color: #999; }

/* 主体 */
.pdf-body {
  flex: 1; display: flex; overflow: hidden;
}

/* 左侧缩略图 */
.pdf-thumbnails {
  width: 140px; flex-shrink: 0;
  background: #2b2b2b;
  overflow-y: auto; overflow-x: hidden;
  padding: 12px 8px;
  border-right: 1px solid #444;
}
.thumb-item {
  display: flex; flex-direction: column; align-items: center;
  margin-bottom: 10px; cursor: pointer;
  padding: 6px; border-radius: 6px;
  border: 2px solid transparent;
  transition: all 0.15s;
}
.thumb-item:hover { background: rgba(255,255,255,0.08); }
.thumb-item.active {
  background: rgba(66,133,244,0.18);
  border-color: #4285F4;
}
.thumb-canvas {
  box-shadow: 0 1px 5px rgba(0,0,0,0.4);
  background: #fff;
  max-width: 100%;
}
.thumb-page-num {
  font-size: 11px; color: #aaa; margin-top: 4px;
}

/* 内容区 */
.pdf-content {
  flex: 1; overflow-y: auto; overflow-x: auto;
  display: flex; flex-direction: column; align-items: center;
  padding: 16px;
}
.pdf-pages-wrapper {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.pdf-page-container {
  background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.4);
}
.pdf-page-inner { position: relative; }
.pdf-canvas { display: block; }
.pdf-text-layer {
  position: absolute; top: 0; left: 0;
  pointer-events: auto; user-select: text;
  line-height: 1;
}
.text-span {
  position: absolute; cursor: text; white-space: pre;
  color: transparent; /* 文字不可见，仅用于选区 */
}
.text-span::selection {
  color: transparent;
  background: rgba(66, 133, 244, 0.35);
}
.pdf-annot-layer {
  position: absolute; top: 0; left: 0;
  pointer-events: none;
}
.pdf-annot-layer .annot-item { pointer-events: auto; cursor: context-menu; }

/* 选中操作浮窗 */
.selection-popup {
  position: fixed; z-index: 10001;
  background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  padding: 6px;
}
.selection-actions {
  display: flex; gap: 4px;
}
.selection-btn {
  border: none; background: none; cursor: pointer;
  padding: 6px 10px; border-radius: 5px; font-size: 12px;
  transition: background 0.15s;
}
.selection-btn:hover { background: #f0f0f0; }
.selection-btn.highlight:hover { background: rgba(255, 235, 59, 0.3); }
.selection-btn.underline:hover { background: rgba(244, 67, 54, 0.12); }
.selection-btn.strike:hover { background: rgba(0,0,0,0.08); }
.selection-btn.note:hover { background: rgba(255, 152, 0, 0.15); }

/* 右键菜单 */
.context-menu {
  position: fixed; z-index: 10003;
  background: #fff; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  padding: 4px 0; min-width: 120px;
}
.context-item {
  display: block; width: 100%; text-align: left;
  border: none; background: none; cursor: pointer;
  padding: 8px 14px; font-size: 13px;
}
.context-item:hover { background: #f2f2f2; }

/* 翻译浮窗 */
.translate-popup {
  position: fixed; z-index: 10001;
  background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  min-width: 280px; max-width: 360px; padding: 12px;
}
.translate-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px; font-weight: 600; font-size: 13px; color: #333;
}
.translate-original {
  font-size: 13px; color: #666; margin-bottom: 8px;
  padding: 8px; background: #f5f5f5; border-radius: 4px;
  max-height: 80px; overflow-y: auto;
}
.translate-result {
  font-size: 13px; color: #333; padding: 8px; background: #e8f5e9;
  border-radius: 4px; min-height: 30px;
}
.close-btn {
  background: none; border: none; cursor: pointer; font-size: 16px; color: #999;
}
.close-btn:hover { color: #333; }

/* 便签弹窗 */
.note-detail-popup {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 10002; background: #fff; border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  width: 400px; max-width: 90vw; padding: 16px;
}
.note-detail-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px; font-weight: 600;
}
.note-detail-textarea {
  width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 10px;
  font-size: 14px; resize: vertical; box-sizing: border-box;
}
.note-detail-actions {
  display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;
}

/* 按钮复用 */
.btn { border: none; border-radius: 6px; cursor: pointer; font-size: 13px; padding: 6px 14px; transition: all 0.15s; }
.btn-primary { background: #2563EB; color: #fff; }
.btn-primary:hover { background: #1D4ED8; }
.btn-ghost { background: none; color: #666; }
.btn-ghost:hover { background: #f0f0f0; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
</style>
