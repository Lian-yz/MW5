<template>
  <div class="dashboard">
    <!-- 顶部三列：学业进度总览（缩窄）+ 论文概览 + 计划完成情况 -->
    <div class="dashboard-top-grid">
      <div class="card section-card progress-rows" style="margin-top:0;">
        <div class="card-header">
          <h2 class="card-title">学业进度总览</h2>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="text-xs text-tertiary" v-if="settingsStore.academicLastModified">
              上次修改：{{ formatLastModified(settingsStore.academicLastModified) }}
            </span>
            <button class="btn btn-sm btn-ghost progress-edit-btn" @click="showProgressEdit = true" title="编辑进度" aria-label="编辑学业进度">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/>
              </svg>
            </button>
          </div>
        </div>
      <div class="progress-rows-body">
        <div v-for="item in progressBreakdown" :key="item.name" class="progress-row-item">
          <span class="progress-row-label">{{ item.name }}</span>
          <div class="progress-row-bar-wrap">
            <div class="progress-row-bar" :style="{ background: item.color + '18' }">
              <div class="progress-row-fill" :style="{ width: item.value + '%', background: item.color }"></div>
            </div>
            <input type="color" :value="item.color" class="progress-color-btn" title="自定义颜色"
              @input="updateItemColor(item, $event.target.value)" />
          </div>
          <span class="progress-row-val">{{ item.value }}%</span>
        </div>
      </div>
    </div>

    <!-- 论文概览 -->
      <div class="card section-card summary-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="file-text" />  论文概览</h2>
          <span class="text-xs text-tertiary">共 {{ papersStore.papers.length }} 篇</span>
        </div>
        <div v-if="papersStore.papers.length > 0" class="paper-overview">
          <div class="paper-mini-list paper-mini-list-solo">
            <div v-for="paper in recentPapers" :key="paper.id" class="paper-mini-item" @click="goResearch">
              <span class="status-badge paper-status-badge" :style="getPaperStatusBadgeStyle(paper.status)">{{ getPaperStatusName(paper.status) }}</span>
              <span class="paper-title">{{ paper.title }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding:16px;">
          <p class="text-xs text-tertiary">暂无论文记录，前往科研中心添加</p>
        </div>
      </div>

      <!-- 计划完成情况（圆环） -->
      <div class="card section-card plan-status-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="bar-chart" />  计划完成情况</h2>
          <button class="btn btn-ghost btn-sm" @click="goPlan">查看全部</button>
        </div>
        <div class="status-chart-wrap" v-if="planStatusTotal > 0">
          <div ref="statusChartRef" class="status-chart-el"></div>
        </div>
        <div class="status-chart-hint" v-if="planStatusTotal > 0">单击色块查看详情 · 双击跳转计划列表</div>
        <div v-if="planStatusTotal === 0" class="empty-state" style="padding:16px;">
          <div class="empty-state-icon"><AppIcon name="file-text" /> </div>
          <p>计划中心还没有计划</p>
        </div>
      </div>
    </div>

    <!-- 第二行：最近仿真 / 最近论文 / 最近组会 -->
    <div class="dashboard-summary-grid">
      <!-- 最近仿真 -->
      <div class="card section-card summary-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="flask" />  最近仿真</h2>
          <button class="btn btn-sm btn-ghost" @click="goSimulation">查看全部</button>
        </div>
        <div v-if="recentSims.length" class="simple-list">
          <div v-for="sim in recentSims" :key="sim.id" class="simple-item" @click="goSimulation">
            <span class="status-badge" :style="simBadgeStyle(sim.status)">{{ simStatusName(sim.status) }}</span>
            <span class="simple-title">{{ sim.subject || '未命名仿真' }}</span>
            <span class="simple-meta">{{ formatSimTime(sim.startTime || sim.createdAt) }}</span>
          </div>
        </div>
        <div v-else class="empty-state" style="padding:16px;">
          <p class="text-xs text-tertiary">暂无仿真记录，前往仿真中心添加</p>
        </div>
      </div>

      <!-- 最近论文（文献库） -->
      <div class="card section-card summary-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="book-open" />  最近论文</h2>
          <button class="btn btn-sm btn-ghost" @click="goPapers">查看全部</button>
        </div>
        <div v-if="recentLibraryPapers.length" class="simple-list">
          <div v-for="paper in recentLibraryPapers" :key="paper.id" class="simple-item" @click="goPapers">
            <span class="status-badge" :style="libBadgeStyle(paper.status)">{{ libStatusName(paper.status) }}</span>
            <span class="simple-title">{{ paper.title || '未命名文献' }}</span>
            <span class="simple-meta">{{ paper.createdAt ? paper.createdAt.slice(0, 10) : '' }}</span>
          </div>
        </div>
        <div v-else class="empty-state" style="padding:16px;">
          <p class="text-xs text-tertiary">暂无文献记录，前往论文中心添加</p>
        </div>
      </div>

      <!-- 最近组会 -->
      <div class="card section-card summary-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="message-circle" />  最近组会</h2>
          <button class="btn btn-sm btn-ghost" @click="goResearch">查看全部</button>
        </div>
        <div v-if="recentMeetings.length" class="meeting-compact-list">
          <div v-for="meeting in recentMeetings" :key="meeting.id" class="meeting-compact-item" @click="goResearch">
            <div class="meeting-compact-head">
              <span class="meeting-compact-date">{{ meeting.date }}</span>
              <span v-if="meeting.timePeriod" class="meeting-compact-time"><AppIcon name="clock" />  {{ meeting.timePeriod }}</span>
            </div>
            <div v-if="getMeetingParticipantsText(meeting)" class="meeting-compact-participants"><AppIcon name="users" />  {{ getMeetingParticipantsText(meeting) }}</div>
            <div class="meeting-compact-excerpt" v-if="meeting.gains || meeting.nextSteps">
              <span v-if="meeting.gains" class="excerpt-line"><b>收获：</b>{{ meeting.gains }}</span>
              <span v-if="meeting.nextSteps" class="excerpt-line"><b>下周：</b>{{ meeting.nextSteps }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state" style="padding:16px;">
          <p class="text-xs text-tertiary">暂无组会纪要，前往科研中心添加</p>
        </div>
      </div>
    </div>

    <!-- 计划详情弹窗 -->
    <div v-if="showPlanDetail && selectedPlan" class="modal-overlay" @click.self="showPlanDetail = false">
      <div class="modal-content" style="max-width: 460px;">
        <button class="modal-close-x" @click="showPlanDetail = false" title="关闭">✕</button>
        <div class="modal-body" style="padding: 24px;">
          <h3 style="margin-bottom: 16px;">计划详情</h3>
          <div class="plan-detail">
            <div class="pd-row">
              <span class="pd-label">标题</span>
              <span class="pd-value">{{ selectedPlan.title }}</span>
            </div>
            <div class="pd-row">
              <span class="pd-label">状态</span>
              <span class="pd-tag" :style="getPlanStatusStyle(selectedPlan.status)">{{ getPlanStatusName(selectedPlan.status) }}</span>
            </div>
            <div class="pd-row">
              <span class="pd-label">分类</span>
              <span class="pd-tag" :style="getPlanCategoryStyle(selectedPlan.category)">{{ getPlanCategoryName(selectedPlan.category) }}</span>
            </div>
            <div class="pd-row">
              <span class="pd-label">层级</span>
              <span class="pd-value">{{ getPlanLevelName(selectedPlan.level) }}</span>
            </div>
            <div class="pd-row">
              <span class="pd-label">优先级</span>
              <span class="pd-tag" :style="getPlanPriorityStyle(selectedPlan.priority)">{{ getPlanPriorityName(selectedPlan.priority) }}</span>
            </div>
            <div class="pd-row" v-if="selectedPlan.startDate || selectedPlan.acceptTime">
              <span class="pd-label">开始</span>
              <span class="pd-value">{{ formatPlanDate(selectedPlan.startDate || selectedPlan.acceptTime) }}</span>
            </div>
            <div class="pd-row" v-if="selectedPlan.endDate">
              <span class="pd-label">截止</span>
              <span class="pd-value" :class="{ overdue: isPlanOverdue(selectedPlan) }">{{ formatPlanDate(selectedPlan.endDate) }}</span>
            </div>
            <div class="pd-row" v-if="selectedPlan.startTime || selectedPlan.endTime">
              <span class="pd-label">时间段</span>
              <span class="pd-value">{{ selectedPlan.startTime || '—' }} - {{ selectedPlan.endTime || '—' }}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-ghost" @click="showPlanDetail = false">关闭</button>
            <button class="btn btn-primary" @click="goPlan">前往任务中心编辑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态任务详情弹窗（圆环单击） -->
    <div v-if="showStatusDetail && statusDetail" class="modal-overlay" @click.self="showStatusDetail = false">
      <div class="modal-content" style="max-width: 460px;">
        <button class="modal-close-x" @click="showStatusDetail = false" title="关闭">✕</button>
        <div class="modal-body" style="padding: 24px;">
          <h3 style="margin-bottom: 16px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="status-detail-dot" :style="{ background: statusDetail.color }"></span>
            {{ statusDetail.name }}
            <span class="text-xs text-tertiary">共 {{ statusDetail.count }} 项 · 占比 {{ statusDetail.percent }}%</span>
          </h3>
          <div class="status-detail-list">
            <div v-for="plan in statusDetail.plans" :key="plan.id" class="status-detail-item" @click="openPlanFromStatus(plan)">
              <span class="sd-title">{{ plan.title }}</span>
              <span v-if="plan.endDate" class="sd-date">{{ formatPlanDate(plan.endDate) }}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn btn-ghost" @click="showStatusDetail = false">关闭</button>
            <button class="btn btn-primary" @click="goPlanLibrary">前往计划列表</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 学业进度编辑弹窗 -->
    <div v-if="showProgressEdit" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showProgressEdit = false })">
      <div class="modal-content" style="max-width: 480px;">
        <div class="modal-body" style="padding: 24px;">
          <h3 style="margin-bottom: 16px;"><AppIcon name="pencil" />  编辑学业进度</h3>
          <p style="font-size:13px;color:var(--color-text-secondary);margin-bottom:12px;">
            总进度 = 各维度平均值（当前：<strong>{{ computedEditAvg }}%</strong>）
          </p>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div v-for="(item, i) in editProgressBreakdown" :key="i" style="display: flex; align-items: center; gap: 8px;">
              <input class="input" v-model="item.name" style="width:80px; font-size:13px;" />
              <input class="input" type="range" min="0" max="100" v-model.number="item.value" style="flex:1;" />
              <span style="min-width:35px; text-align:right; font-weight:600;">{{ item.value }}%</span>
              <input class="input" v-model="item.color" type="color" style="width:32px; height:28px; padding:0; border:none;" title="颜色" />
              <button class="btn btn-sm btn-ghost" @click="removeBreakdownItem(i)" v-if="editProgressBreakdown.length > 1">✕</button>
            </div>
            <button class="btn btn-ghost btn-sm" @click="addBreakdownItem">+ 添加维度</button>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn-ghost" @click="showProgressEdit = false">取消</button>
              <button class="btn btn-primary" @click="saveProgress">保存</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useResearchStore, useSettingsStore, usePapersStore, usePlanStore, useSimulationStore, usePaperLibraryStore } from '../stores'
import dayjs from 'dayjs'
import * as echarts from 'echarts'

const router = useRouter()
const researchStore = useResearchStore()
const settingsStore = useSettingsStore()
const papersStore = usePapersStore()
const planStore = usePlanStore()
const simStore = useSimulationStore()
const paperLibraryStore = usePaperLibraryStore()

function goPlan() { router.push('/plan') }
function goResearch() { router.push('/research') }
function goSimulation() { router.push('/simulation') }
function goPapers() { router.push('/papers') }

const showProgressEdit = ref(false)

// 编辑进度
const editProgressBreakdown = ref(settingsStore.academicBreakdown.map(item => ({ ...item })))

const computedAcademicProgress = computed(() => {
  const items = settingsStore.academicBreakdown
  if (items.length === 0) return 0
  const sum = items.reduce((s, i) => s + (i.value || 0), 0)
  return Math.round(sum / items.length)
})

const progressBreakdown = computed(() => settingsStore.academicBreakdown)

const computedEditAvg = computed(() => {
  if (editProgressBreakdown.value.length === 0) return 0
  const sum = editProgressBreakdown.value.reduce((s, i) => s + (i.value || 0), 0)
  return Math.round(sum / editProgressBreakdown.value.length)
})

// ===== 论文概览 =====
const recentPapers = computed(() => {
  const active = papersStore.papers.filter(p => p.status !== 'published')
  const sorted = [...active].sort((a, b) => {
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    if (a.deadline) return -1
    if (b.deadline) return 1
    return (b.createdAt || '').localeCompare(a.createdAt || '')
  })
  return sorted.slice(0, 3)
})

function getPaperStatusName(statusId) {
  return papersStore.statuses.find(s => s.id === statusId)?.name || statusId || '未知'
}

function getPaperStatusBadgeStyle(statusId) {
  const s = papersStore.statuses.find(s => s.id === statusId)
  if (!s) return {}
  return { background: s.color + '20', color: s.color }
}

// ===== 最近仿真 =====
const recentSims = computed(() => simStore.recent.slice(0, 3))

const simStatusOptions = computed(() => simStore.statusOptions || [])

function simStatusName(id) {
  return simStatusOptions.value.find(s => s.id === id)?.name || id || '未知'
}

function simBadgeStyle(id) {
  const s = simStatusOptions.value.find(s => s.id === id)
  if (!s) return {}
  return { background: s.color + '20', color: s.color }
}

function formatSimTime(t) {
  if (!t) return ''
  const s = String(t)
  if (s.includes('T')) return s.replace('T', ' ')
  return s
}

// ===== 最近论文（文献库） =====
const recentLibraryPapers = computed(() => (paperLibraryStore.sortedPapers || []).slice(0, 3))

const libStatuses = computed(() => paperLibraryStore.statuses || [])

function libStatusName(id) {
  return libStatuses.value.find(s => s.id === id)?.name || id || '未知'
}

function libBadgeStyle(id) {
  const s = libStatuses.value.find(s => s.id === id)
  if (!s) return {}
  return { background: s.color + '20', color: s.color }
}

// ===== 最近组会 =====
const recentMeetings = computed(() => (researchStore.meetings || []).slice(0, 3))

// 参与人员显示格式化：兼容 v5.0.278 前的旧字符串格式与现在的对象数组格式，
// 避免对象数组被直接输出成 JSON 原文（乱码问题根因）
function getMeetingParticipantsText(meeting) {
  const p = meeting && meeting.participants
  if (!p) return ''
  if (Array.isArray(p)) {
    return p.map(item => {
      if (typeof item === 'string') return item
      return (item && item.name) || ''
    }).filter(Boolean).join('、')
  }
  if (typeof p === 'string') return p
  if (typeof p === 'object') {
    return Object.values(p).map(item => {
      if (typeof item === 'string') return item
      return (item && item.name) || ''
    }).filter(Boolean).join('、')
  }
  return String(p)
}

// ===== 计划完成情况（状态占比） =====
const planStatuses = computed(() => settingsStore.planStatuses || [])
const planCategories = computed(() => settingsStore.planCategories || [])
const planLevels = computed(() => settingsStore.planLevels || [])
const planPriorities = computed(() => settingsStore.planPriorities || [])

// 双击圆环 → 跳转计划中心「计划列表」Tab
function goPlanLibrary() {
  settingsStore.setActiveSubTab('/plan', 'library')
  router.push('/plan')
}

function getPlanStatusName(id) {
  return planStatuses.value.find(s => s.id === id)?.name || id || '未知'
}
function getPlanStatusStyle(id) {
  const s = planStatuses.value.find(s => s.id === id)
  return s ? { background: s.color + '20', color: s.color } : {}
}
function getPlanCategoryName(id) {
  return planCategories.value.find(c => c.id === id)?.name || id || '其他'
}
function getPlanCategoryStyle(id) {
  const c = planCategories.value.find(c => c.id === id)
  return c ? { background: c.color + '20', color: c.color } : {}
}
function getPlanLevelName(id) {
  return planLevels.value.find(l => l.id === id)?.name || id || '—'
}
function getPlanPriorityName(id) {
  return planPriorities.value.find(p => p.id === id)?.name || id || '—'
}
function getPlanPriorityStyle(id) {
  const p = planPriorities.value.find(p => p.id === id)
  return p ? { background: p.color + '20', color: p.color } : {}
}
// ===== 圆环交互：单击色块查看状态任务详情，双击跳转计划列表 =====
const showStatusDetail = ref(false)
const statusDetail = ref(null)
let statusClickTimer = null

function handleStatusClick(params) {
  const statusId = params?.data?.statusId
  if (!statusId) return
  // 延时触发，与双击区分：若 260ms 内发生双击则取消详情弹窗
  clearTimeout(statusClickTimer)
  statusClickTimer = setTimeout(() => {
    const target = planStatusCounts.value.find(s => s.id === statusId && s.count > 0)
    if (!target) return
    statusDetail.value = target
    showStatusDetail.value = true
  }, 260)
}

function handleChartDblClick() {
  clearTimeout(statusClickTimer)
  goPlanLibrary()
}

function openPlanFromStatus(plan) {
  showStatusDetail.value = false
  openPlanDetail(plan)
}

const showPlanDetail = ref(false)
const selectedPlan = ref(null)
function openPlanDetail(plan) {
  selectedPlan.value = plan
  showPlanDetail.value = true
}
function formatPlanDate(val) {
  if (!val) return '—'
  const s = String(val)
  return s.length > 10 ? dayjs(s).format('YYYY-MM-DD HH:mm') : s
}
function isPlanOverdue(plan) {
  if (!plan.endDate || plan.status === 'completed') return false
  return dayjs(String(plan.endDate).slice(0, 10)).isBefore(dayjs(), 'day')
}

const planStatusTotal = computed(() => planStore.plans.length)
const planStatusCounts = computed(() => {
  const total = planStatusTotal.value
  return planStatuses.value.map(s => {
    const plans = planStore.plans.filter(p => (p.status || 'active') === s.id)
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      count: plans.length,
      percent: total ? Math.round((plans.length / total) * 100) : 0,
      plans: plans.map(p => ({ ...p })),
    }
  })
})

const statusChartRef = ref(null)
let statusChartInstance = null

function initStatusChart() {
  if (!statusChartRef.value) return
  if (statusChartInstance) { statusChartInstance.dispose(); statusChartInstance = null }
  statusChartInstance = echarts.init(statusChartRef.value)
  statusChartInstance.on('click', handleStatusClick)
  // 双击图表任意区域（含中心空白）跳转计划列表
  if (statusChartInstance.getZr()) {
    statusChartInstance.getZr().on('dblclick', handleChartDblClick)
  }
  updateStatusChart()
}

function updateStatusChart() {
  if (!statusChartInstance) return
  const data = planStatusCounts.value
    .filter(s => s.count > 0)
    .map(s => ({ name: s.name, value: s.count, statusId: s.id, itemStyle: { color: s.color } }))
  if (data.length === 0) {
    statusChartInstance.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#9CA3AF', fontSize: 14 } },
      series: []
    }, true)
    return
  }
  statusChartInstance.setOption({
    textStyle: { color: '#6B7280' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} 项 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['45%', '72%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#1F2937' } },
      itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
      data,
    }],
  }, true)
}

watch(() => planStore.plans, () => {
  nextTick(() => updateStatusChart())
}, { deep: true })

onMounted(() => {
  nextTick(() => initStatusChart())
})

onActivated(() => {
  nextTick(() => {
    if (!statusChartInstance) {
      initStatusChart()
    } else {
      statusChartInstance.resize()
      updateStatusChart()
    }
  })
})

onBeforeUnmount(() => {
  clearTimeout(statusClickTimer)
  if (statusChartInstance) { statusChartInstance.dispose(); statusChartInstance = null }
})

function formatLastModified(dt) {
  if (!dt) return ''
  return dayjs(dt).format('MM-DD HH:mm')
}

function saveProgress() {
  const avg = computedEditAvg.value
  settingsStore.saveAcademicProgress(avg, editProgressBreakdown.value.map(item => ({ ...item })))
  showProgressEdit.value = false
}

function addBreakdownItem() {
  editProgressBreakdown.value.push({ name: '新维度', value: 0, color: '#6B7280' })
}

function removeBreakdownItem(index) {
  if (editProgressBreakdown.value.length > 1) {
    editProgressBreakdown.value.splice(index, 1)
  }
}

function updateItemColor(item, color) {
  item.color = color
  settingsStore.saveAcademicProgress(computedAcademicProgress.value, progressBreakdown.value.map(i => ({ ...i })))
}
</script>

<style scoped>
.dashboard {
  width: 100%;
  overflow-x: hidden;
}

/* 顶部三列：学业进度总览（缩窄）+ 论文概览 + 计划完成情况 */
.dashboard-top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.5fr) minmax(0, 1.05fr);
  gap: 20px;
  margin-bottom: 20px;
  align-items: stretch;
}
.dashboard-top-grid .progress-rows {
  margin-bottom: 0;
  height: 100%;
}

/* 学业进度：自适应宽度 */
.progress-rows {
  padding: 16px 22px;
}
.progress-edit-btn svg {
  flex-shrink: 0;
}
.progress-rows .card-header {
  margin-bottom: 12px;
}
.progress-rows-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.progress-row-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.progress-row-label {
  min-width: 70px;
  max-width: 110px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.progress-row-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.progress-row-bar {
  flex: 1;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
}
.progress-row-fill {
  height: 100%;
  border-radius: 6px;
  transition: width var(--transition-normal);
  min-width: 2px;
}
.progress-color-btn {
  width: 18px;
  height: 18px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  background: none;
}
.progress-color-btn::-webkit-color-swatch-wrapper {
  padding: 0;
}
.progress-color-btn::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}
.progress-row-val {
  min-width: 40px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: right;
  flex-shrink: 0;
}

/* 第二行：最近仿真 / 最近论文 / 最近组会 一行三列 */
.dashboard-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
.summary-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 260px;
  min-width: 0;
  overflow: hidden;
}

/* 公共列表样式 */
.simple-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.simple-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 0;
  overflow: hidden;
}
.simple-item:hover {
  background: var(--color-bg-hover);
  transform: translateY(-1px);
}
.simple-title {
  flex: 1 1 0%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-weight: 500;
}
.simple-meta {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}
.status-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  font-weight: 500;
  white-space: nowrap;
}

/* 论文概览 */
.paper-overview {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.paper-status-badge {
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.paper-mini-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.paper-mini-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 0;
}
.paper-mini-item:hover {
  background: var(--color-bg-hover);
  transform: translateY(-1px);
}
.paper-title {
  flex: 1 1 0%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-weight: 500;
}

/* 最近组会 */
.meeting-compact-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.meeting-compact-item {
  padding: 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 0;
  overflow: hidden;
}
.meeting-compact-item:hover {
  background: var(--color-bg-hover);
  transform: translateY(-1px);
}
.meeting-compact-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  flex-wrap: wrap;
  min-width: 0;
}
.meeting-compact-date {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-primary);
}
.meeting-compact-time,
.meeting-compact-participants {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.meeting-compact-excerpt {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  min-width: 0;
}
.excerpt-line {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 底部周历样式已随「最近计划」模块移除（v5.0.281） */

/* 完成情况环形图 */
.plan-status-card {
  display: flex;
  flex-direction: column;
}
.status-chart-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  padding: 8px 0;
}
.status-chart-el {
  width: 200px;
  height: 200px;
}
.status-chart-hint {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-top: 8px;
}

/* 状态任务详情弹窗 */
.status-detail-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}
.status-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 46vh;
  overflow-y: auto;
}
.status-detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 0;
}
.status-detail-item:hover {
  background: var(--color-bg-hover);
}
.sd-title {
  flex: 1 1 0%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.sd-date {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

/* 公共 */
.section-card {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  min-width: 0;
  gap: 8px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.text-xs {
  font-size: 12px;
}
.text-tertiary {
  color: var(--color-text-tertiary);
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-tertiary);
  flex: 1;
  gap: 8px;
}
.empty-state-icon {
  font-size: 28px;
}
.empty-state p {
  font-size: 13px;
}

/* 计划详情弹窗 */
.plan-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pd-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pd-label {
  width: 56px;
  font-size: 13px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.pd-value {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}
.pd-value.overdue {
  color: var(--color-danger);
}
.pd-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}

/* 响应式 */
@media (max-width: 1180px) {
  .dashboard-top-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .dashboard-summary-grid {
    grid-template-columns: 1fr;
  }
  .progress-row-label {
    min-width: 60px;
    max-width: 80px;
  }
}
</style>
