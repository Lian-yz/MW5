<template>
  <div class="nav-page">
    <!-- 顶级页签：总览 / 网站导航 / 订阅中心 -->
    <div class="tab-bar">
      <div class="tab-pill">
        <button v-for="top in topTabs" :key="top.id" class="tab-btn"
          :class="{ active: topTab === top.id }" @click="topTab = top.id">
          {{ top.name }}
        </button>
      </div>
    </div>

    <!-- 总览：常用网站 + 订阅动态 -->
    <div v-if="topTab === 'overview'" class="tab-content">
      <div class="overview-page">
        <div class="overview-col">
          <div class="overview-header">
            <h3 class="overview-title"><AppIcon name="pin" />  常用网站</h3>
            <button class="btn btn-ghost btn-sm" @click="topTab = 'websites'">去网站导航 →</button>
          </div>
          <div class="overview-site-grid">
            <div v-for="site in recentSites" :key="site.id" class="overview-site-card card-hover" @click="openSite(site)">
              <span class="overview-site-icon"><AppIcon :name="site.icon" :size="32" /></span>
              <div class="overview-site-info">
                <div class="overview-site-name">{{ site.name }}</div>
                <div class="overview-site-url">{{ (site.url || '').replace(/^https?:\/\//, '').slice(0, 28) }}</div>
                <div class="overview-site-meta">点击 {{ site.clicks || 0 }} · 今日 {{ getTodayClicks(site) }}</div>
              </div>
            </div>
            <div v-if="!recentSites.length" class="overview-empty">
              <div class="empty-state-icon"><AppIcon name="paperclip" /> </div>
              <p>暂无常用网站<br>去「网站导航」添加并开始使用吧</p>
            </div>
          </div>
        </div>
        <div class="overview-col">
          <div class="overview-header">
            <h3 class="overview-title"><AppIcon name="wifi" />  订阅动态</h3>
            <button class="btn btn-ghost btn-sm" @click="topTab = 'subscription'">去订阅中心 →</button>
          </div>
          <div class="overview-sub-list">
            <div v-for="sub in recentSubs" :key="sub.id" class="overview-sub-card card-hover" @click="topTab = 'subscription'">
              <div class="overview-sub-head">
                <span class="overview-sub-name">{{ sub.name }}</span>
                <span class="overview-sub-count">{{ sub.items?.length || 0 }} 篇</span>
              </div>
              <div v-if="sub.items && sub.items.length" class="overview-sub-latest-list">
                <div v-for="(item, idx) in sub.items.slice(0, 3)" :key="idx" class="overview-sub-latest">
                  <div class="overview-sub-latest-title" :title="item.title">{{ item.title }}</div>
                  <div class="overview-sub-latest-date">{{ formatDate(item.date) }}</div>
                </div>
              </div>
              <div v-else class="overview-sub-latest empty">暂无文献，去订阅中心粘贴/上传原文</div>
            </div>
            <div v-if="!recentSubs.length" class="overview-empty">
              <div class="empty-state-icon"><AppIcon name="wifi" /> </div>
              <p>暂无订阅<br>去「订阅中心」添加并导入文献吧</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 网站导航 -->
    <div v-if="topTab === 'websites'" class="tab-content">
    <div class="nav-websites-header">
      <div class="nav-header-top">
        <h2 class="card-title">网站导航</h2>
        <div class="card-header-actions">
          <button class="header-btn" :class="{ active: sortMode }" @click="toggleSortMode" title="手动排序">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            手动排序
          </button>
          <button class="header-btn" @click="showAddCategory = true">+ 新建分类</button>
          <button class="header-btn header-btn-primary" @click="showAddSite = true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加网站
          </button>
        </div>
      </div>
      <div class="nav-stats-row">
        <div class="nav-stat">
          <span class="stat-num">{{ navStore.todayClicks }}</span>
          <span class="stat-desc">今日点击</span>
        </div>
        <div class="nav-stat">
          <span class="stat-num">{{ navStore.sites.length }}</span>
          <span class="stat-desc">收藏网站</span>
        </div>
        <div class="nav-stat">
          <span class="stat-num">{{ navStore.categories.length }}</span>
          <span class="stat-desc">分类数</span>
        </div>
      </div>
    </div>

    <div class="nav-categories">
      <div v-for="(category, catIdx) in navStore.categories" :key="category" class="nav-category">
        <div class="category-header">
          <!-- 排序模式：分类排序箭头 -->
          <div v-if="sortMode" class="category-sort-arrows">
            <button class="sort-arrow" :disabled="catIdx === 0" @click="moveCategory(catIdx, -1)" title="上移"><AppIcon name="chevron-up" :size="14" /></button>
            <button class="sort-arrow" :disabled="catIdx === navStore.categories.length - 1" @click="moveCategory(catIdx, 1)" title="下移"><AppIcon name="chevron-down" :size="14" /></button>
          </div>
          <h3 class="category-title">{{ category }}</h3>
          <span class="category-count">{{ navStore.sitesByCategory[category]?.length || 0 }}个网站</span>
          <button v-if="!sortMode" class="category-delete-btn" @click="deleteCategory(category)" title="删除分类"><AppIcon name="trash" /> </button>
        </div>
        <div class="site-grid"
          :class="{ 'drag-over-cat': dragOverCategory === category }"
          @dragover.prevent="!sortMode && (dragOverCategory = category)"
          @dragleave="dragOverCategory = null"
          @drop.prevent="onDropSite(category)">
          <div v-for="(site, idx) in navStore.sitesByCategory[category]" :key="site.id"
            class="site-card card-hover"
            :class="{ 'sort-mode': sortMode, 'dragging-site': draggingSite && draggingSite.id === site.id }"
            :draggable="!sortMode"
            @dragstart="onDragSite(site, $event)"
            @dragend="onDragEndSite"
            @click="sortMode ? null : openSite(site)">
            <div class="site-icon"><AppIcon :name="site.icon" :size="28" /></div>
            <div class="site-info">
              <div class="site-name">{{ site.name }}</div>
              <div class="site-url">{{ (site.url || '').replace(/^https?:\/\//, '').slice(0, 25) }}</div>
              <div class="site-clicks">今日 {{ getTodayClicks(site) }} · 本周 {{ getWeekClicks(site) }}</div>
            </div>
            <!-- 排序按钮 -->
            <div v-if="sortMode" class="sort-arrows">
              <button class="sort-arrow" :disabled="idx === 0" @click.stop="moveSite(category, idx, -1)" title="上移"><AppIcon name="chevron-up" :size="14" /></button>
              <button class="sort-arrow" :disabled="idx === (navStore.sitesByCategory[category]?.length || 0) - 1" @click.stop="moveSite(category, idx, 1)" title="下移"><AppIcon name="chevron-down" :size="14" /></button>
            </div>
            <button v-else class="site-edit" @click.stop="editSite(site)" title="编辑网站" aria-label="编辑网站">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
          </div>
          <div v-if="!navStore.sitesByCategory[category]?.length" class="empty-mini">
            该分类下暂无网站
          </div>
        </div>
      </div>
    </div>

    <!-- 添加网站弹窗 -->
    <div v-if="showAddSite" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showAddSite = false })">
      <div class="modal-content" style="max-width: 440px;">
            <button class="modal-close-x" @click="showAddSite = false" title="关闭">✕</button>
        <div style="padding: 24px;">
          <h3 style="margin-bottom: 16px;">添加网站</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px;">
              <input class="input" v-model="newSite.icon" placeholder="图标" style="width: 60px;" />
              <input class="input" v-model="newSite.name" placeholder="网站名称" />
            </div>
            <input class="input" v-model="newSite.url" placeholder="网址（https://...）" />
            <GlassSelect
              v-model="newSite.category"
              select-class="input"
              :options="navStore.categories.map(cat => ({ value: cat, label: cat }))"
            />
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn-ghost" @click="showAddSite = false">取消</button>
              <button class="btn btn-primary" @click="addSite">添加</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建分类弹窗 -->
    <div v-if="showAddCategory" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showAddCategory = false })">
      <div class="modal-content" style="max-width: 380px;">
            <button class="modal-close-x" @click="showAddCategory = false" title="关闭">✕</button>
        <div style="padding: 24px;">
          <h3 style="margin-bottom: 16px;">新建分类</h3>
          <input class="input" v-model="newCategory" placeholder="分类名称（如：生物信息工具）" />
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;">
            <button class="btn btn-ghost" @click="showAddCategory = false">取消</button>
            <button class="btn btn-primary" @click="addCategory">创建</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑网站弹窗 -->
    <div v-if="editingSite" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { editingSite = null })">
      <div class="modal-content" style="max-width: 440px;">
            <button class="modal-close-x" @click="editingSite = false" title="关闭">✕</button>
        <div style="padding: 24px;">
          <h3 style="margin-bottom: 16px;">编辑网站</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px;">
              <input class="input" v-model="editingSite.icon" placeholder="图标" style="width: 60px;" />
              <input class="input" v-model="editingSite.name" placeholder="网站名称" />
            </div>
            <input class="input" v-model="editingSite.url" placeholder="网址" />
            <GlassSelect
              v-model="editingSite.category"
              select-class="input"
              :options="navStore.categories.map(cat => ({ value: cat, label: cat }))"
            />
            <div style="display: flex; gap: 8px; justify-content: space-between;">
              <button class="btn btn-danger btn-sm" @click="deleteSite">删除网站</button>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-ghost" @click="editingSite = null">取消</button>
                <button class="btn btn-primary" @click="saveSite">保存</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- 订阅中心 -->
    <div v-if="topTab === 'subscription'" class="tab-content">
      <SubscriptionCenter />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNavigationStore, useSubscriptionStore, useSettingsStore } from '../stores'
import { todayStr } from '../utils/storage'
import { openPath } from '../utils/desktopBridge'
import dayjs from 'dayjs'
import SubscriptionCenter from '../views/SubscriptionCenter.vue'
import GlassSelect from '../components/common/GlassSelect.vue'

const navStore = useNavigationStore()
const subStore = useSubscriptionStore()
const settingsStore = useSettingsStore()

// 科研导航顶级页签：总览 / 网站导航 / 订阅中心
const topTab = ref(settingsStore.activeSubTabs['/navigation'] || 'websites')
watch(topTab, (v) => settingsStore.setActiveSubTab('/navigation', v))
watch(() => settingsStore.activeSubTabs['/navigation'], (v) => { if (v && v !== topTab.value) topTab.value = v })
const topTabs = [
  { id: 'overview', name: '总览' },
  { id: 'websites', name: '网站导航' },
  { id: 'subscription', name: '订阅中心' },
]

const showAddSite = ref(false)
const showAddCategory = ref(false)
const editingSite = ref(null)
const sortMode = ref(false)

const newSite = ref({ icon: '', name: '', url: '', category: '文献检索' })
const newCategory = ref('')

// 跨分类拖拽
const draggingSite = ref(null)
const dragOverCategory = ref(null)

function onDragSite(site, e) {
  draggingSite.value = site
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', site.id)
  }
}
function onDragEndSite() {
  draggingSite.value = null
  dragOverCategory.value = null
}
function onDropSite(category) {
  if (draggingSite.value && draggingSite.value.category !== category) {
    navStore.moveSiteToCategory(draggingSite.value.id, category)
  }
  draggingSite.value = null
  dragOverCategory.value = null
}

function toggleSortMode() {
  sortMode.value = !sortMode.value
}

function getTodayClicks(site) {
  const today = todayStr()
  return site.clickDates?.filter(d => d === today).length || 0
}

function getWeekClicks(site) {
  const weekStart = dayjs().startOf('week').format('YYYY-MM-DD')
  return site.clickDates?.filter(d => d >= weekStart).length || 0
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const recentSites = computed(() => {
  return (Array.isArray(navStore.sites) ? navStore.sites : [])
    .filter(s => s && s.id && s.url)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 8)
})

const recentSubs = computed(() => {
  return (Array.isArray(subStore.subscriptions) ? subStore.subscriptions : [])
    .filter(s => s && s.id && s.name)
    .filter(s => s.enabled !== false)
    .sort((a, b) => {
      const hasA = a.items && a.items.length
      const hasB = b.items && b.items.length
      if (hasB !== hasA) return hasB - hasA
      return (b.lastFetched || '').localeCompare(a.lastFetched || '')
    })
    .slice(0, 6)
})

function openSite(site) {
  navStore.recordClick(site.id)
  openPath(site.url)
}

function addSite() {
  if (!newSite.value.name.trim() || !newSite.value.url.trim()) return
  navStore.addSite({ ...newSite.value })
  newSite.value = { icon: '', name: '', url: '', category: '文献检索' }
  showAddSite.value = false
}

function addCategory() {
  if (!newCategory.value.trim()) return
  navStore.addCategory(newCategory.value)
  newCategory.value = ''
  showAddCategory.value = false
}

function editSite(site) {
  editingSite.value = { ...site }
}

function saveSite() {
  navStore.updateSite(editingSite.value.id, {
    name: editingSite.value.name,
    url: editingSite.value.url,
    icon: editingSite.value.icon,
    category: editingSite.value.category,
  })
  editingSite.value = null
}

function deleteSite() {
  if (confirm('确定删除这个网站吗？')) {
    navStore.deleteSite(editingSite.value.id)
    editingSite.value = null
  }
}

function moveSite(category, fromIndex, direction) {
  navStore.reorderSites(category, fromIndex, fromIndex + direction)
}

function moveCategory(fromIndex, direction) {
  navStore.reorderCategories(fromIndex, fromIndex + direction)
}

function deleteCategory(category) {
  const count = navStore.sitesByCategory[category]?.length || 0
  const msg = count > 0
    ? `确定删除分类"${category}"吗？\n\n该分类下有 ${count} 个网站，删除分类后这些网站也将被删除。`
    : `确定删除分类"${category}"吗？`
  if (confirm(msg)) {
    navStore.deleteCategory(category)
  }
}
</script>

<style scoped>
.nav-page { max-width: 1800px; margin: 0 auto; }

.nav-websites-header { margin-bottom: 20px; }
.nav-header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.nav-stats-row { display: flex; gap: 12px; flex-wrap: wrap; }
.nav-stat { text-align: center; background: var(--color-bg); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 10px 20px; min-width: 92px; }
.stat-num { display: block; font-size: 20px; font-weight: 700; color: var(--color-primary); }
.stat-desc { font-size: 12px; color: var(--color-text-tertiary); }
.nav-actions { display: flex; gap: 8px; }

.nav-categories { display: flex; flex-direction: column; gap: 20px; }
.category-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.category-title { font-size: 15px; font-weight: 600; }
.category-count { font-size: 12px; color: var(--color-text-tertiary); }
.category-delete-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.4;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}
.category-delete-btn:hover {
  opacity: 1;
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.category-sort-arrows {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
}

.site-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; border-radius: var(--radius-md); transition: background var(--transition-fast); }
.site-grid.drag-over-cat { background: var(--color-primary-bg); outline: 2px dashed var(--color-primary); outline-offset: 2px; }
.dragging-site { opacity: 0.4; }
.site-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  background: white;
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
}
.site-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
}
.site-card.sort-mode {
  cursor: default;
}
.site-card.sort-mode:hover {
  border-color: var(--color-warning);
  box-shadow: var(--shadow-sm);
}
.site-icon { font-size: 28px; flex-shrink: 0; }
.site-info { flex: 1; min-width: 0; }
.site-name { font-size: 14px; font-weight: 600; }
.site-url { font-size: 11px; color: var(--color-text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.site-clicks { font-size: 11px; color: var(--color-text-tertiary); margin-top: 2px; }
.site-edit {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
}
.site-edit:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
  border-color: var(--color-primary);
}
.site-card:hover .site-edit { opacity: 1; }

/* 排序箭头 */
.sort-arrows {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}
.sort-arrow {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 10px;
  color: var(--color-text-tertiary);
  padding: 2px 4px;
  border-radius: 2px;
  line-height: 1;
  transition: all var(--transition-fast);
}
.sort-arrow:hover:not(:disabled) {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}
.sort-arrow:disabled {
  opacity: 0.2;
  cursor: default;
}

.empty-mini { font-size: 13px; color: var(--color-text-tertiary); padding: 12px; }

/* 顶级页签：总览 / 网站导航 / 订阅中心 */
.tab-bar { display: flex; justify-content: center; margin-bottom: 20px; }
.tab-pill { display: inline-flex; background: var(--color-bg); border: 1px solid var(--color-border-light); border-radius: var(--radius-full); padding: 4px; gap: 4px; }
.tab-btn {
  padding: 8px 32px; border: none; background: transparent; color: var(--color-text-secondary);
  border-radius: var(--radius-full); cursor: pointer; font-size: 14px; font-weight: 500;
  transition: all var(--transition-fast); min-width: 120px; text-align: center;
}
.tab-btn:hover { color: var(--color-text-primary); background: rgba(0,0,0,0.03); }
.tab-btn.active { color: #fff; background: var(--color-primary); box-shadow: 0 2px 8px rgba(37,99,235,0.25); }
.tab-content { animation: fade .2s; }
@keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }

/* 总览占位 */
.empty-state { text-align: center; color: var(--color-text-tertiary); padding: 60px 0; }
.empty-state-icon { font-size: 44px; margin-bottom: 10px; }

/* 总览双栏布局 */
.overview-page { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.overview-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: color-mix(in srgb, var(--color-bg-card) 70%, transparent);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 16px;
}
.overview-header { display: flex; align-items: center; justify-content: space-between; }
.overview-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin: 0; }
.overview-sub-list { display: flex; flex-direction: column; gap: 10px; }
.overview-site-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.overview-site-card {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px;
  padding: 16px 10px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light); background: var(--color-bg-card);
  cursor: pointer; transition: all var(--transition-fast);
}
.overview-site-card:hover { border-color: var(--color-primary); box-shadow: var(--shadow-sm); }
.overview-site-icon { font-size: 32px; line-height: 1; }
.overview-site-info { min-width: 0; width: 100%; }
.overview-site-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overview-site-url { font-size: 11px; color: var(--color-text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.overview-site-meta { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
.overview-sub-card {
  padding: 12px 14px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light); background: var(--color-bg-card);
  cursor: pointer; transition: all var(--transition-fast);
}
.overview-sub-card:hover { border-color: var(--color-primary); box-shadow: var(--shadow-sm); }
.overview-sub-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.overview-sub-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.overview-sub-count { font-size: 12px; color: var(--color-primary); background: rgba(37,99,235,0.08); padding: 1px 8px; border-radius: 999px; }
.overview-sub-latest-list { display: flex; flex-direction: column; gap: 8px; }
.overview-sub-latest { font-size: 13px; color: var(--color-text-secondary); }
.overview-sub-latest-title { color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px; }
.overview-sub-latest-date { font-size: 12px; color: var(--color-text-tertiary); }
.overview-sub-latest.empty { color: var(--color-text-tertiary); font-size: 12px; }
.overview-empty { text-align: center; color: var(--color-text-tertiary); padding: 36px 0; border: 1px dashed var(--color-border-light); border-radius: var(--radius-md); background: var(--color-bg); }
.overview-empty p { font-size: 13px; line-height: 1.6; margin: 0; }

@media (max-width: 900px) {
  .overview-page { grid-template-columns: 1fr; }
}
</style>
