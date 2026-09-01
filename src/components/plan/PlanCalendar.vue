<template>
  <div class="plan-calendar">
    <!-- 工具栏 -->
    <div class="cal-toolbar">
      <div class="cal-title">
        <span class="cal-title-main">{{ titleMain }}</span>
        <span v-if="titleSub" class="cal-title-sub">{{ titleSub }}</span>
      </div>
      <div class="cal-controls">
        <button class="btn btn-ghost btn-sm" @click="goToday">今天</button>
        <div class="cal-nav">
          <button class="btn btn-ghost btn-sm" @click="prev">‹</button>
          <button class="btn btn-ghost btn-sm" @click="next">›</button>
        </div>
        <select class="input cal-nav-select cal-year-select" :value="currentDate.year()" @change="onYearChange">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}年</option>
        </select>
        <select v-if="viewMode !== 'year'" class="input cal-nav-select" :value="currentDate.month() + 1" @change="onMonthChange">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
        </select>
        <select class="input cal-view-select" v-model="viewMode" v-if="!lockedView">
          <option value="month">月</option>
          <option value="year">年</option>
          <option value="week">周</option>
          <option value="multiweek">2周</option>
        </select>
        <button class="btn btn-primary btn-sm" @click="emitAdd">+ 新建计划</button>
      </div>
    </div>

    <!-- 月视图 -->
    <template v-if="viewMode === 'month'">
      <div class="cal-month">
        <div class="cal-weekdays">
          <div v-for="w in weekdays" :key="w" class="cal-weekday">{{ w }}</div>
        </div>
        <div class="cal-month-grid">
          <div
            v-for="cell in monthCells" :key="cell.dateStr"
            class="cal-month-cell"
            :class="{ other: !cell.isCurrentMonth, today: cell.isToday, selected: cell.dateStr === selectedDate }"
            @click="selectDate(cell.dateStr)"
          >
            <div class="cell-header">
              <div class="cell-date">
                <span class="cell-day" :class="{ 'day-today': cell.isToday }">{{ cell.day }}</span>
                <span class="cell-sub">{{ cell.isToday ? '今日' : shortWeekdays[cell.weekday] }}</span>
              </div>
              <span v-if="cell.plans.length" class="cell-count">{{ cell.plans.length }}</span>
            </div>
            <div class="cell-bars">
              <div
                v-for="(plan, idx) in cell.plans.slice(0, 4)" :key="plan.id + '_' + idx"
                class="plan-bar"
                :style="{ background: getPlanColor(plan) + '18', color: getPlanColor(plan) }"
                :title="plan.title"
                @click.stop="openDetail(plan)"
              >
                <span class="plan-bar-text">{{ plan.title }}</span>
              </div>
              <div v-if="cell.plans.length > 4" class="more-plans">+{{ cell.plans.length - 4 }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 年视图 -->
    <template v-if="viewMode === 'year'">
      <div class="cal-year">
        <div v-for="month in yearMonths" :key="month.monthIdx" class="cal-year-month">
          <div class="year-month-title">{{ month.monthIdx + 1 }}月</div>
          <div class="year-weekdays">
            <span v-for="w in shortWeekdays" :key="w">{{ w }}</span>
          </div>
          <div class="year-days">
            <span
              v-for="(d, idx) in month.days" :key="month.monthIdx + '-' + idx"
              class="year-day"
              :class="{ other: !d.isCurrentMonth, today: d.isToday, 'has-plan': d.plans.length }"
              :style="d.plans.length ? { background: getPlanColor(d.plans[0]) + '20' } : {}"
              :title="d.plans.map(p => p.title).join('、')"
              @click="d && selectDate(d.dateStr)"
            >{{ d ? d.day : '' }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 周视图 -->
    <template v-if="viewMode === 'week'">
      <div class="cal-week">
        <div class="cal-week-header">
          <div class="week-time-col"></div>
          <div
            v-for="day in weekDays" :key="day.dateStr"
            class="week-day-col"
            :class="{ today: day.isToday }"
          >
            <div class="week-day-name">{{ day.weekdayName }}</div>
            <div class="week-day-number" :class="{ 'day-today': day.isToday }">{{ day.day }}</div>
            <div class="week-day-plans">
              <div
                v-for="plan in day.plans" :key="plan.id"
                class="week-plan-chip"
                :style="{ background: getPlanColor(plan) + '20', color: getPlanColor(plan), borderLeft: '3px solid ' + getPlanColor(plan) }"
                :title="plan.title"
                @click.stop="openDetail(plan)"
              >{{ plan.title }}</div>
            </div>
          </div>
        </div>
        <div class="cal-week-body">
          <div class="week-time-col">
            <div v-for="h in hours" :key="h" class="time-slot-label">{{ h }}:00</div>
          </div>
          <div
            v-for="day in weekDays" :key="day.dateStr"
            class="week-day-grid"
            :class="{ today: day.isToday }"
          >
            <div v-for="h in hours" :key="h" class="time-slot"></div>
            <div
              v-for="plan in day.plans.filter(p => p.startTime || p.endTime)" :key="plan.id + '-block'"
              class="week-plan-block"
              :style="getWeekPlanBlockStyle(plan, day.dateStr)"
              @click.stop="openDetail(plan)"
            >
              <span class="block-title">{{ plan.title }}</span>
              <span v-if="plan.startTime || plan.endTime" class="block-time">{{ plan.startTime }} - {{ plan.endTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 多周视图（2周） -->
    <template v-if="viewMode === 'multiweek'">
      <div class="cal-month">
        <div class="cal-weekdays">
          <div v-for="w in weekdays" :key="w" class="cal-weekday">{{ w }}</div>
        </div>
        <div class="cal-month-grid multiweek">
          <div
            v-for="cell in multiweekCells" :key="cell.dateStr"
            class="cal-month-cell"
            :class="{ today: cell.isToday, selected: cell.dateStr === selectedDate }"
            @click="selectDate(cell.dateStr)"
          >
            <div class="cell-header">
              <div class="cell-date">
                <span class="cell-day" :class="{ 'day-today': cell.isToday }">{{ cell.day }}</span>
                <span class="cell-sub">{{ cell.isToday ? '今日' : shortWeekdays[cell.weekday] }}</span>
              </div>
              <span v-if="cell.plans.length" class="cell-count">{{ cell.plans.length }}</span>
            </div>
            <div class="cell-bars">
              <div
                v-for="(plan, idx) in cell.plans.slice(0, 3)" :key="plan.id + '_' + idx"
                class="plan-bar"
                :style="{ background: getPlanColor(plan) + '18', color: getPlanColor(plan) }"
                :title="plan.title"
                @click.stop="openDetail(plan)"
              >
                <span class="plan-bar-text">{{ plan.title }}</span>
              </div>
              <div v-if="cell.plans.length > 3" class="more-plans">+{{ cell.plans.length - 3 }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 选中日期的计划侧栏 -->
    <div v-if="selectedDate" class="cal-side-panel">
      <div class="side-header">
        <span class="side-title">{{ selectedDateDisplay }}</span>
        <button class="btn btn-sm btn-ghost" @click="selectedDate = ''">关闭</button>
      </div>
      <div v-if="selectedPlans.length === 0" class="empty-state" style="padding: 24px;">
        <p>暂无计划</p>
      </div>
      <div v-else class="side-plan-list">
        <div
          v-for="plan in selectedPlans" :key="plan.id"
          class="side-plan-item"
          :class="{ completed: plan.status === 'completed' }"
          @click="openDetail(plan)"
        >
          <span class="side-dot" :style="{ background: getPlanColor(plan) }"></span>
          <div class="side-plan-info">
            <div class="side-plan-title">{{ plan.title }}</div>
            <div class="side-plan-meta">
              <span class="side-tag" :style="{ background: getStatusStyle(plan.status).background, color: getStatusStyle(plan.status).color }">{{ getStatusName(plan.status) }}</span>
              <span class="side-tag" :style="{ background: getCategoryStyle(plan.category).background, color: getCategoryStyle(plan.category).color }">{{ getCategoryName(plan.category) }}</span>
              <span v-if="plan.endDate" class="side-date">截止 {{ formatDate(plan.endDate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务只读详情弹窗（单击任务弹出，仅「编辑」按钮可进入修改） -->
    <div v-if="showDetail && detailPlan" class="detail-mask" @click.self="closeDetail">
      <div class="detail-modal">
        <div class="detail-header">
          <span class="detail-status-dot" :style="{ background: getPlanColor(detailPlan) }"></span>
          <span class="detail-title">{{ detailPlan.title }}</span>
          <button class="detail-close" @click="closeDetail">✕</button>
        </div>
        <div class="detail-body">
          <div class="detail-row">
            <span class="detail-label">状态</span>
            <span class="detail-tag" :style="{ background: getStatusStyle(detailPlan.status).background, color: getStatusStyle(detailPlan.status).color }">{{ getStatusName(detailPlan.status) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">分类</span>
            <span class="detail-tag" :style="{ background: getCategoryStyle(detailPlan.category).background, color: getCategoryStyle(detailPlan.category).color }">{{ getCategoryName(detailPlan.category) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">层级</span>
            <span class="detail-value">{{ getLevelName(detailPlan.level) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">优先级</span>
            <span class="detail-value">{{ getPriorityName(detailPlan.priority) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">开始</span>
            <span class="detail-value">{{ detailPlan.startDate || (detailPlan.acceptTime ? formatDate(detailPlan.acceptTime) : '—') }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">截止</span>
            <span class="detail-value">{{ detailPlan.endDate ? formatDate(detailPlan.endDate) : '—' }}</span>
          </div>
          <div v-if="detailPlan.startTime || detailPlan.endTime" class="detail-row">
            <span class="detail-label">时间段</span>
            <span class="detail-value">{{ detailPlan.startTime || '—' }} - {{ detailPlan.endTime || '—' }}</span>
          </div>
          <div v-if="detailPlan.description" class="detail-row detail-desc-row">
            <span class="detail-label">描述</span>
            <span class="detail-value detail-desc">{{ detailPlan.description }}</span>
          </div>
          <div v-if="detailPlan.subtasks && detailPlan.subtasks.filter(s => s && s.text).length" class="detail-row detail-sub-row">
            <span class="detail-label">子任务</span>
            <div class="detail-sub-list">
              <span
                v-for="(s, i) in detailPlan.subtasks.filter(x => x && x.text)" :key="i"
                class="detail-sub-item"
                :style="s.color ? { background: s.color, color: '#fff' } : {}"
              >{{ s.text }}</span>
            </div>
          </div>
        </div>
        <div class="detail-footer">
          <button class="btn btn-primary" @click="editFromDetail">编辑</button>
          <button class="btn btn-ghost" @click="closeDetail">关闭</button>
        </div>
        <div class="detail-readonly-tip">只读预览 · 点击「编辑」可修改</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePlanStore, useSettingsStore } from '../../stores'
import { todayStr } from '../../utils/storage'
import dayjs from 'dayjs'

const emit = defineEmits(['add', 'edit'])

const props = defineProps({
  lockedView: { type: String, default: '' }, // 锁定视图（如 'week'）则不显示切换下拉
})

const planStore = usePlanStore()
const settingsStore = useSettingsStore()

const viewMode = ref(props.lockedView || 'month')
const currentDate = ref(dayjs())
const selectedDate = ref(todayStr())
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const shortWeekdays = ['日', '一', '二', '三', '四', '五', '六']
const hours = Array.from({ length: 15 }, (_, i) => i + 7) // 07:00 - 21:00

// ===== 配置数据 =====
const planStatuses = computed(() => settingsStore.planStatuses || [])
const planCategories = computed(() => settingsStore.planCategories || [])
const planLevels = computed(() => settingsStore.planLevels || [])
const planPriorities = computed(() => settingsStore.planPriorities || [])

function getStatusItem(statusId) {
  return planStatuses.value.find(s => s.id === statusId) || { name: statusId, color: '#6B7280' }
}
function getStatusName(statusId) {
  return getStatusItem(statusId).name
}
function getStatusStyle(statusId) {
  const s = getStatusItem(statusId)
  return { background: s.color + '20', color: s.color }
}
function normalizeCategory(val) {
  const byId = planCategories.value.find(c => c.id === val)
  if (byId) return byId.id
  const byName = planCategories.value.find(c => c.name === val)
  if (byName) return byName.id
  return val || 'other'
}
function getCategoryItem(val) {
  const id = normalizeCategory(val)
  return planCategories.value.find(c => c.id === id) || { name: val || '其他', color: '#6B7280' }
}
function getCategoryName(val) {
  return getCategoryItem(val).name
}
function getCategoryStyle(val) {
  const c = getCategoryItem(val)
  return { background: c.color + '20', color: c.color }
}
function getPlanColor(plan) {
  return getCategoryItem(plan.category).color
}

// ===== 计划日期解析 =====
function planStart(plan) {
  const d = plan.startDate || plan.acceptTime || plan.createdAt
  return d ? dayjs(String(d).slice(0, 10)) : null
}
function planEnd(plan) {
  const d = plan.endDate
  return d ? dayjs(String(d).slice(0, 10)) : planStart(plan)
}
function planSpansDate(plan, dateStr) {
  const end = planEnd(plan)
  if (!end) return false
  const d = dayjs(dateStr)
  // 按计划层级（粒度）决定展示时段：日计划只在截止日当天、周计划在截止日所在周、
  // 月计划在截止日所在月、年计划在截止日所在年（以此类推）
  const level = plan.level
  if (level === 'day') return d.isSame(end, 'day')
  if (level === 'week') return d.isSame(end, 'week')
  if (level === 'month') return d.isSame(end, 'month')
  if (level === 'year') return d.isSame(end, 'year')
  // 未知/未设置层级：回退到 开始~截止 区间判断
  const start = planStart(plan)
  if (!start) return false
  return d.isSame(start, 'day') || d.isSame(end, 'day') || (d.isAfter(start, 'day') && d.isBefore(end, 'day'))
}
function planTime(plan, type) {
  const raw = type === 'start' ? (plan.startDate || plan.acceptTime || plan.createdAt) : plan.endDate
  if (!raw) return null
  const s = String(raw)
  if (s.length > 10) {
    const t = dayjs(s)
    return t.format('HH:mm')
  }
  return null
}

// ===== 标题 =====
const titleMain = computed(() => {
  if (viewMode.value === 'year') return currentDate.value.format('YYYY年')
  if (viewMode.value === 'month') return currentDate.value.format('M月')
  if (viewMode.value === 'week' || viewMode.value === 'multiweek') {
    const start = currentDate.value.startOf('week')
    const end = currentDate.value.endOf('week')
    return start.format('M月D日') + ' - ' + end.format('M月D日')
  }
  return ''
})
const titleSub = computed(() => {
  if (viewMode.value === 'year') return ''
  return currentDate.value.format('YYYY年')
})

// ===== 月视图 =====
const monthCells = computed(() => {
  const firstDay = currentDate.value.startOf('month')
  const daysInMonth = firstDay.daysInMonth()
  const startWeekday = firstDay.day()
  const today = todayStr()
  const cells = []

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = firstDay.subtract(i + 1, 'day')
    cells.push(makeCell(d, false, today))
  }
  for (let i = 0; i < daysInMonth; i++) {
    const d = firstDay.add(i, 'day')
    cells.push(makeCell(d, true, today))
  }
  const remaining = 42 - cells.length
  for (let i = 0; i < remaining; i++) {
    const d = firstDay.add(daysInMonth + i, 'day')
    cells.push(makeCell(d, false, today))
  }
  return cells
})

function makeCell(d, isCurrentMonth, today) {
  const dateStr = d.format('YYYY-MM-DD')
  return {
    dateStr,
    day: d.date(),
    weekday: d.day(),
    isCurrentMonth,
    isToday: dateStr === today,
    plans: planStore.plans.filter(p => planSpansDate(p, dateStr)),
  }
}

// ===== 年视图 =====
const yearMonths = computed(() => {
  const year = currentDate.value.year()
  const today = todayStr()
  return Array.from({ length: 12 }, (_, m) => {
    const firstDay = dayjs().year(year).month(m).startOf('month')
    const daysInMonth = firstDay.daysInMonth()
    const startWeekday = firstDay.day()
    const days = []
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = firstDay.subtract(i + 1, 'day')
      days.push(makeCell(d, false, today))
    }
    for (let i = 0; i < daysInMonth; i++) {
      const d = firstDay.add(i, 'day')
      days.push(makeCell(d, true, today))
    }
    const remaining = 42 - days.length
    for (let i = 0; i < remaining; i++) {
      const d = firstDay.add(daysInMonth + i, 'day')
      days.push(makeCell(d, false, today))
    }
    return { monthIdx: m, days }
  })
})

// ===== 周视图 =====
const weekDays = computed(() => {
  const start = currentDate.value.startOf('week')
  const today = todayStr()
  return Array.from({ length: 7 }, (_, i) => {
    const d = start.add(i, 'day')
    const dateStr = d.format('YYYY-MM-DD')
    const plans = planStore.plans.filter(p => planSpansDate(p, dateStr))
    return {
      dateStr,
      day: d.date(),
      weekdayName: weekdays[i],
      isToday: dateStr === today,
      plans: plans.map(p => ({
        ...p,
        startTime: planTime(p, 'start'),
        endTime: planTime(p, 'end'),
      })),
    }
  })
})

function getWeekPlanBlockStyle(plan, dateStr) {
  const start = planStart(plan)
  const end = planEnd(plan)
  const d = dayjs(dateStr)
  let startHour = 8
  let duration = 2
  if (plan.startTime) {
    const [h, m] = plan.startTime.split(':').map(Number)
    startHour = h + m / 60
  } else if (d.isSame(start, 'day')) {
    startHour = 9
  }
  if (plan.endTime && plan.startTime) {
    const [h1, m1] = plan.startTime.split(':').map(Number)
    const [h2, m2] = plan.endTime.split(':').map(Number)
    duration = (h2 + m2 / 60) - (h1 + m1 / 60)
  }
  const top = (startHour - 7) * 48
  const height = Math.max(duration * 48, 24)
  return {
    top: top + 'px',
    height: height + 'px',
    background: getPlanColor(plan) + '20',
    color: getPlanColor(plan),
    borderLeft: '3px solid ' + getPlanColor(plan),
  }
}

// ===== 多周视图 =====
const multiweekCells = computed(() => {
  const start = currentDate.value.startOf('week')
  const today = todayStr()
  const cells = []
  for (let i = 0; i < 14; i++) {
    const d = start.add(i, 'day')
    cells.push(makeCell(d, true, today))
  }
  return cells
})

// ===== 选中日期的计划 =====
const selectedPlans = computed(() => {
  if (!selectedDate.value) return []
  return planStore.plans.filter(p => planSpansDate(p, selectedDate.value))
})
const selectedDateDisplay = computed(() => {
  return dayjs(selectedDate.value).format('YYYY年M月D日 dddd')
})

// ===== 导航 =====
function prev() {
  if (viewMode.value === 'month') currentDate.value = currentDate.value.subtract(1, 'month')
  else if (viewMode.value === 'year') currentDate.value = currentDate.value.subtract(1, 'year')
  else if (viewMode.value === 'week') currentDate.value = currentDate.value.subtract(1, 'week')
  else if (viewMode.value === 'multiweek') currentDate.value = currentDate.value.subtract(2, 'week')
}
function next() {
  if (viewMode.value === 'month') currentDate.value = currentDate.value.add(1, 'month')
  else if (viewMode.value === 'year') currentDate.value = currentDate.value.add(1, 'year')
  else if (viewMode.value === 'week') currentDate.value = currentDate.value.add(1, 'week')
  else if (viewMode.value === 'multiweek') currentDate.value = currentDate.value.add(2, 'week')
}
function goToday() {
  currentDate.value = dayjs()
  selectedDate.value = todayStr()
}
function selectDate(dateStr) {
  selectedDate.value = dateStr
}
// 直接选择年份 / 月份查看计划
const yearOptions = computed(() => {
  const base = dayjs().year()
  const list = []
  for (let y = base - 10; y <= base + 10; y++) list.push(y)
  return list
})
function onYearChange(e) {
  const y = Number(e.target.value)
  currentDate.value = currentDate.value.year(y)
}
function onMonthChange(e) {
  const m = Number(e.target.value) - 1
  currentDate.value = currentDate.value.month(m)
}
function emitAdd() {
  emit('add', selectedDate.value || todayStr())
}
function emitEdit(plan) {
  emit('edit', plan)
}
function getLevelName(levelId) {
  const item = planLevels.value.find(l => l.id === levelId)
  return item ? item.name : (levelId || '未设置')
}
function getPriorityName(priorityVal) {
  const item = planPriorities.value.find(p => p.value === priorityVal)
  return item ? item.name : (priorityVal != null ? String(priorityVal) : '未设置')
}

// ===== 只读详情弹窗（单击任务弹出，需点「编辑」才可修改）=====
const detailPlan = ref(null)
const showDetail = ref(false)
function openDetail(plan) {
  detailPlan.value = plan
  showDetail.value = true
}
function closeDetail() {
  showDetail.value = false
  detailPlan.value = null
}
function editFromDetail() {
  const p = detailPlan.value
  showDetail.value = false
  if (p) emit('edit', p)
}
function formatDate(val) {
  const s = String(val)
  return s.length > 10 ? dayjs(s).format('MM-DD HH:mm') : s
}
</script>

<style scoped>
.plan-calendar { display: flex; flex-direction: column; gap: 16px; }

/* 工具栏 */
.cal-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  background: transparent; border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md); padding: 12px 16px;
  box-shadow: var(--shadow-xs);
}
.cal-title { display: flex; align-items: baseline; gap: 10px; }
.cal-title-main { font-size: 20px; font-weight: 700; }
.cal-title-sub { font-size: 14px; color: var(--color-text-tertiary); }
.cal-controls { display: flex; align-items: center; gap: 10px; }
.cal-nav { display: flex; gap: 4px; }
.cal-view-select { width: 90px; flex-shrink: 0; }
.cal-nav-select { width: 84px; flex-shrink: 0; white-space: nowrap; }
.cal-year-select { width: 100px; }

/* 月/多周网格 */
.cal-month { background: transparent; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 16px; }
.cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 8px; }
.cal-weekday { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); padding: 6px 0; }
.cal-month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--color-border-light); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); overflow: hidden; }
.cal-month-grid.multiweek { grid-template-rows: repeat(2, 1fr); }
.cal-month-cell { background: rgba(255,255,255,0.5); min-height: 118px; padding: 8px 8px 6px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: background var(--transition-fast); }
.cal-month-cell:hover { background: var(--color-bg-hover); }
.cal-month-cell.other { background: rgba(248, 249, 251, 0.5); }
.cal-month-cell.other .cell-day { color: var(--color-text-tertiary); font-weight: 500; }
.cal-month-cell.other .cell-sub { color: var(--color-text-tertiary); opacity: 0.7; }
.cal-month-cell.other .cell-count { color: var(--color-text-tertiary); opacity: 0.7; }
.cal-month-cell.today { background: var(--color-primary-bg); }
.cal-month-cell.selected { box-shadow: inset 0 0 0 2px var(--color-primary); }
.cell-header { display: flex; justify-content: space-between; align-items: flex-start; }
.cell-date { display: flex; flex-direction: column; gap: 2px; }
.cell-day { font-size: 18px; font-weight: 700; color: var(--color-text-primary); line-height: 1.2; }
.cell-day.day-today { color: var(--color-primary); }
.cell-sub { font-size: 11px; color: var(--color-text-tertiary); line-height: 1.2; }
.cell-count { font-size: 11px; color: var(--color-text-tertiary); font-weight: 500; }
.cell-bars { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
.plan-bar { font-size: 10px; height: 18px; padding: 0 6px; border-radius: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; cursor: pointer; display: flex; align-items: center; }
.plan-bar:hover { filter: brightness(0.95); }
.plan-bar-text { display: block; overflow: hidden; text-overflow: ellipsis; }
.more-plans { font-size: 10px; color: var(--color-text-tertiary); text-align: center; }

/* 年视图 */
.cal-year { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.cal-year-month { background: transparent; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 12px; }
.year-month-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.year-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: var(--color-text-tertiary); margin-bottom: 4px; }
.year-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.year-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; border-radius: var(--radius-sm); cursor: pointer; }
.year-day:hover { background: var(--color-bg-hover); }
.year-day.other { color: var(--color-text-tertiary); opacity: 0.5; }
.year-day.today { background: var(--color-primary); color: white; }
.year-day.has-plan { font-weight: 600; }

/* 周视图 */
.cal-week { background: transparent; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); overflow: hidden; }
.cal-week-header { display: grid; grid-template-columns: 56px repeat(7, 1fr); border-bottom: 1px solid var(--color-border-light); }
.week-time-col { border-right: 1px solid var(--color-border-light); }
.week-day-col { padding: 10px 6px; text-align: center; border-right: 1px solid var(--color-border-light); min-height: 90px; }
.week-day-col:last-child { border-right: none; }
.week-day-col.today { background: var(--color-primary-bg); }
.week-day-name { font-size: 12px; color: var(--color-text-secondary); }
.week-day-number { font-size: 16px; font-weight: 700; margin: 4px 0; }
.week-day-number.day-today { color: var(--color-primary); }
.week-day-plans { display: flex; flex-direction: column; gap: 3px; }
.week-plan-chip { font-size: 10px; padding: 2px 4px; border-radius: 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; cursor: pointer; }
.cal-week-body { display: grid; grid-template-columns: 56px repeat(7, 1fr); position: relative; }
.week-day-grid { border-right: 1px solid var(--color-border-light); position: relative; height: 720px; }
.week-day-grid:last-child { border-right: none; }
.week-day-grid.today { background: var(--color-primary-bg); }
.time-slot { height: 48px; border-bottom: 1px solid var(--color-border-light); }
.time-slot-label { height: 48px; font-size: 10px; color: var(--color-text-tertiary); text-align: right; padding-right: 6px; padding-top: 4px; border-right: 1px solid var(--color-border-light); border-bottom: 1px solid var(--color-border-light); }
.week-plan-block { position: absolute; left: 2px; right: 2px; border-radius: 4px; padding: 3px 5px; font-size: 10px; overflow: hidden; cursor: pointer; display: flex; flex-direction: column; }
.block-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-time { font-size: 9px; opacity: 0.85; }

/* 侧边栏 */
.cal-side-panel { background: transparent; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 16px; }
.side-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.side-title { font-size: 15px; font-weight: 700; }
.side-plan-list { display: flex; flex-direction: column; gap: 8px; }
.side-plan-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: var(--radius-md); background: rgba(255,255,255,0.5); cursor: pointer; }
.side-plan-item:hover { background: var(--color-bg-hover); }
.side-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.side-plan-info { flex: 1; min-width: 0; }
.side-plan-title { font-size: 14px; font-weight: 500; margin-bottom: 6px; }
.side-plan-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.side-tag { font-size: 11px; padding: 1px 6px; border-radius: 10px; }
.side-date { font-size: 11px; color: var(--color-text-tertiary); }

.empty-state { text-align: center; color: var(--color-text-tertiary); font-size: 13px; }

/* 任务只读详情弹窗 */
.detail-mask {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.detail-modal {
  position: relative;
  width: 420px; max-width: calc(100vw - 32px); max-height: calc(100vh - 64px); overflow-y: auto;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-radius: var(--radius-lg, 14px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25); padding: 20px 22px;
}
.detail-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-right: 38px; }
.detail-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.detail-title { font-size: 17px; font-weight: 700; flex: 1; min-width: 0; word-break: break-word; }
.detail-close {
  position: absolute; top: 12px; right: 14px;
  width: 32px; height: 32px; border: none; border-radius: 50%;
  background: var(--color-bg, #F4F6FB); color: var(--color-text-secondary);
  font-size: 16px; line-height: 1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.detail-close:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.detail-body { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; align-items: flex-start; gap: 12px; }
.detail-label { width: 56px; flex-shrink: 0; font-size: 13px; color: var(--color-text-tertiary); padding-top: 2px; }
.detail-value { font-size: 14px; color: var(--color-text-primary); word-break: break-word; flex: 1; }
.detail-tag { font-size: 12px; padding: 2px 10px; border-radius: 10px; }
.detail-desc { line-height: 1.6; white-space: pre-wrap; }
.detail-desc-row { align-items: flex-start; }
.detail-sub-row { align-items: flex-start; }
.detail-sub-list { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.detail-sub-item { font-size: 12px; padding: 2px 10px; border-radius: 10px; background: var(--color-bg); color: var(--color-text-secondary); }
.detail-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.detail-readonly-tip { margin-top: 12px; text-align: center; font-size: 12px; color: var(--color-text-tertiary); }
.btn { padding: 8px 18px; border-radius: var(--radius-md, 8px); font-size: 14px; cursor: pointer; border: 1px solid transparent; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-primary:hover { filter: brightness(0.95); }
.btn-ghost { background: var(--color-bg); color: var(--color-text-secondary); border-color: var(--color-border-light); }
.btn-ghost:hover { background: var(--color-bg-hover); }

/* ===== 响应式：年视图 4 列 → 2 列 → 1 列 ===== */
@media (max-width: 900px) {
  .cal-year { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 520px) {
  .cal-year { grid-template-columns: 1fr; }
}
</style>
