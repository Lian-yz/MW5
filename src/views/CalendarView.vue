<template>
  <div class="calendar-page">
    <!-- 数据概览 -->
    <div class="data-overview">
      <div class="overview-item">
        <span class="overview-icon"><AppIcon name="bar-chart" /> </span>
        <div>
          <span class="overview-value">{{ academicProgress }}%</span>
          <span class="overview-label">学业进度</span>
        </div>
      </div>
      <div class="overview-item">
        <span class="overview-icon"><AppIcon name="clock" /> </span>
        <div>
          <span class="overview-value">{{ timerStore.todayFocusDisplay }}</span>
          <span class="overview-label">今日专注</span>
        </div>
      </div>
      <div class="overview-item">
        <span class="overview-icon"><AppIcon name="file-text" /> </span>
        <div>
          <span class="overview-value">{{ activeTaskCount }}</span>
          <span class="overview-label">进行中任务</span>
        </div>
      </div>
      <div class="overview-item">
        <span class="overview-icon"><AppIcon name="flame" /> </span>
        <div>
          <span class="overview-value">{{ timerStore.streakDays }}天</span>
          <span class="overview-label">连续记录</span>
        </div>
      </div>
    </div>

    <!-- 月历 -->
    <div class="card section-card">
      <div class="calendar-header">
        <button class="btn btn-ghost btn-sm" @click="prevMonth">‹</button>
        <h2 class="calendar-title" @click="goToday">{{ currentYear }}年{{ currentMonth + 1 }}月</h2>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-ghost" :class="{ active: calendarCompact }" @click="calendarCompact = true" title="紧凑视图">⊞</button>
          <button class="btn btn-sm btn-ghost" :class="{ active: !calendarCompact }" @click="calendarCompact = false" title="宽松视图">⊟</button>
          <button class="btn btn-ghost btn-sm" @click="nextMonth">›</button>
        </div>
      </div>
      <div class="calendar-grid" :class="{ compact: calendarCompact }">
        <div class="calendar-weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
        <div v-for="day in calendarDays" :key="day.key"
          class="calendar-day"
          :class="{
            other: !day.currentMonth,
            today: day.isToday,
            selected: day.date === selectedDate,
            hasTasks: day.taskCount > 0
          }"
          @click="selectDate(day.date)">
          <span class="day-number">{{ day.day }}</span>
          <div class="day-dots" v-if="day.taskCount > 0">
            <span class="day-dot" v-for="n in Math.min(day.taskCount, 3)" :key="n"></span>
          </div>
          <span class="day-task-count" v-if="day.taskCount > 0">{{ day.taskCount }}</span>
        </div>
      </div>
    </div>

    <!-- 选中日期的任务列表 -->
    <div class="card section-card">
      <div class="card-header">
        <h2 class="card-title">{{ selectedDateDisplay }} 的任务</h2>
        <button class="btn btn-primary btn-sm" @click="showAddTask = true">+ 添加任务</button>
      </div>
      <div class="task-list">
        <div v-for="task in selectedDateTasks" :key="task.id" class="cal-task-item"
          :class="{ completed: task.completed, isPlan: task._source === 'plan' }">
          <div class="task-checkbox" @click="toggleTask(task)">
            <span v-if="task.completed">✓</span>
          </div>
          <div class="task-content">
            <div class="task-header">
              <span class="task-title">{{ task.title }}</span>
              <div class="task-tags">
                <span v-if="task._source === 'plan'" class="tag tag-plan" :title="'计划级别: ' + getLevelName(task.planLevel)"><AppIcon name="file-text" />  计划</span>
                <span class="tag" :style="getCategoryStyle(task.category)">{{ getCategoryName(task.category) }}</span>
                <span v-if="task.priority === 3" class="tag tag-danger">高</span>
                <span v-else-if="task.priority === 2" class="tag tag-warning">中</span>
              </div>
            </div>
            <div class="task-progress" v-if="!task.completed">
              <div class="progress-bar">
                <div class="progress-bar-fill" :style="{ width: task.progress + '%' }"></div>
              </div>
              <span class="progress-text">{{ task.progress }}%</span>
            </div>
          </div>
        </div>
        <div v-if="selectedDateTasks.length === 0" class="empty-state">
          <div class="empty-state-icon"><AppIcon name="inbox" /> </div>
          <p>这一天没有任务安排</p>
        </div>
      </div>
    </div>

    <!-- 日常提醒 -->
    <div class="card section-card">
      <div class="card-header">
        <h2 class="card-title"><AppIcon name="zap" />  快捷操作</h2>
      </div>
      <div class="quick-actions">
        <button class="quick-btn" @click="quickMemo">
          <span class="quick-icon"><AppIcon name="file-edit" /> </span>
          <span>随手记一笔</span>
        </button>
        <button class="quick-btn" @click="$router.push('/plan')">
          <span class="quick-icon"><AppIcon name="bar-chart" /> </span>
          <span>学业概览</span>
        </button>
        <button class="quick-btn" @click="$router.push('/')">
          <span class="quick-icon"><AppIcon name="home" /> </span>
          <span>返回首页</span>
        </button>
      </div>
    </div>

    <!-- 添加任务弹窗 -->
    <div v-if="showAddTask" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showAddTask = false })">
      <div class="modal-content" style="max-width: 440px;">
            <button class="modal-close-x" @click="showAddTask = false" title="关闭">✕</button>
        <div style="padding: 24px;">
          <h3 style="margin-bottom: 16px;">添加任务 - {{ selectedDate }}</h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <input class="input" v-model="newTask.title" placeholder="任务标题" @keyup.enter="addTask" />
            <GlassSelect
              v-model="newTask.category"
              select-class="input"
              :options="tasksStore.categories.map(cat => ({ value: cat.id, label: cat.name }))"
            />
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" v-for="p in [3,2,1]" :key="p"
                :style="newTask.priority === p ? { background: 'var(--color-primary)', color: 'white' } : {}"
                @click="newTask.priority = p">{{ p === 3 ? '高' : p === 2 ? '中' : '低' }}</button>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn btn-ghost" @click="showAddTask = false">取消</button>
              <button class="btn btn-primary" @click="addTask">添加</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 备忘录弹窗 -->
    <div v-if="showMemo" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showMemo = false })">
      <div class="modal-content" style="max-width: 400px;">
            <button class="modal-close-x" @click="showMemo = false" title="关闭">✕</button>
        <div style="padding: 24px;">
          <h3 style="margin-bottom: 16px;"><AppIcon name="file-edit" />  随手记一笔</h3>
          <textarea class="input" v-model="memoText" placeholder="想到什么就写什么..." rows="4"></textarea>
          <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;">
            <button class="btn btn-ghost" @click="showMemo = false">取消</button>
            <button class="btn btn-primary" @click="saveMemo">保存</button>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTasksStore, usePlanStore, useTimerStore, useSettingsStore } from '../stores'
import { todayStr } from '../utils/storage'
import dayjs from 'dayjs'
import GlassSelect from '../components/common/GlassSelect.vue'

const tasksStore = useTasksStore()
const planStore = usePlanStore()
const timerStore = useTimerStore()
const settingsStore = useSettingsStore()

const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month())
const selectedDate = ref(todayStr())
const showAddTask = ref(false)
const showMemo = ref(false)
const memoText = ref('')
const toastMsg = ref('')
const calendarCompact = ref(false)

const newTask = ref({ title: '', category: 'core_research', priority: 2 })
const academicProgress = computed(() => settingsStore.academicProgress)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const calendarDays = computed(() => {
  const firstDay = dayjs().year(currentYear.value).month(currentMonth.value).startOf('month')
  const daysInMonth = firstDay.daysInMonth()
  const startWeekday = firstDay.day()
  const days = []

  // 上月填充
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = firstDay.subtract(i + 1, 'day')
    days.push({ key: d.format('YYYY-MM-DD'), day: d.date(), date: d.format('YYYY-MM-DD'), currentMonth: false, isToday: d.format('YYYY-MM-DD') === todayStr(), taskCount: getTaskCount(d.format('YYYY-MM-DD')) })
  }
  // 本月
  for (let i = 0; i < daysInMonth; i++) {
    const d = firstDay.add(i, 'day')
    days.push({ key: d.format('YYYY-MM-DD'), day: d.date(), date: d.format('YYYY-MM-DD'), currentMonth: true, isToday: d.format('YYYY-MM-DD') === todayStr(), taskCount: getTaskCount(d.format('YYYY-MM-DD')) })
  }
  // 下月填充
  const remaining = 42 - days.length
  for (let i = 0; i < remaining; i++) {
    const d = firstDay.add(daysInMonth + i, 'day')
    days.push({ key: d.format('YYYY-MM-DD'), day: d.date(), date: d.format('YYYY-MM-DD'), currentMonth: false, isToday: d.format('YYYY-MM-DD') === todayStr(), taskCount: getTaskCount(d.format('YYYY-MM-DD')) })
  }
  return days
})

function getTaskCount(date) {
  const taskCount = tasksStore.tasksByDate(date).length
  const planCount = planStore.plans.filter(p => {
    if (!p.startDate) return false
    if (p.endDate) return date >= p.startDate && date <= p.endDate
    return date === p.startDate
  }).length
  return taskCount + planCount
}

const selectedDateTasks = computed(() => {
  const tasks = tasksStore.tasksByDate(selectedDate.value)
  const plans = planStore.plans.filter(p => {
    if (!p.startDate) return false
    if (p.endDate) return selectedDate.value >= p.startDate && selectedDate.value <= p.endDate
    return selectedDate.value === p.startDate
  }).map(p => ({
    ...p,
    _source: 'plan',
    completed: p.status === 'completed',
    date: selectedDate.value,
    planLevel: p.level,
  }))
  return [...tasks, ...plans]
})

const selectedDateDisplay = computed(() => {
  return dayjs(selectedDate.value).format('MM月DD日 dddd')
})

const activeTaskCount = computed(() => {
  return tasksStore.pendingTasks.length + planStore.plans.filter(p => p.status === 'active').length
})

function selectDate(date) {
  selectedDate.value = date
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function goToday() {
  currentYear.value = dayjs().year()
  currentMonth.value = dayjs().month()
  selectedDate.value = todayStr()
}

function toggleTask(task) {
  if (task._source === 'plan') {
    if (task.status === 'completed') {
      planStore.updatePlan(task.id, { status: 'active', progress: Math.max(0, task.progress - 10) })
    } else {
      planStore.updatePlan(task.id, { status: 'completed', progress: 100 })
    }
    return
  }
  if (task.completed) {
    tasksStore.uncompleteTask(task.id)
  } else {
    tasksStore.completeTask(task.id)
  }
}

function addTask() {
  if (!newTask.value.title.trim()) return
  tasksStore.addTask({ ...newTask.value, date: selectedDate.value })
  newTask.value = { title: '', category: 'core_research', priority: 2 }
  showAddTask.value = false
}

function getCategoryName(catId) {
  return tasksStore.categories.find(c => c.id === catId)?.name || '日常'
}

function getCategoryStyle(catId) {
  const cat = tasksStore.categories.find(c => c.id === catId)
  return cat ? { background: cat.color + '20', color: cat.color } : {}
}

const LEVEL_NAMES = { day: '日', week: '周', month: '月', quarter: '季', halfyear: '半年', year: '年' }
function getLevelName(level) {
  return LEVEL_NAMES[level] || level
}

function quickMemo() {
  showMemo.value = true
  memoText.value = ''
}

function saveMemo() {
  if (!memoText.value.trim()) return
  tasksStore.addTask({ title: memoText.value.slice(0, 50), category: 'daily', priority: 1 })
  showMemo.value = false
  toastMsg.value = '已保存为备忘任务'
  setTimeout(() => { toastMsg.value = '' }, 2000)
}
</script>

<style scoped>
.calendar-page { max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }

.data-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.overview-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: var(--radius-md);
  background: white;
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-xs);
}
.overview-icon { font-size: 24px; }
.overview-value { display: block; font-size: 18px; font-weight: 700; color: var(--color-text-primary); }
.overview-label { font-size: 12px; color: var(--color-text-tertiary); }

.section-card { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; }

.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.calendar-title { font-size: 18px; font-weight: 700; cursor: pointer; }

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.calendar-weekday {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 8px 0;
}
.calendar-day {
  height: 72px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  border-radius: var(--radius-md);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
  border: 2px solid transparent;
  padding: 4px 8px;
}
.calendar-grid.compact .calendar-day {
  height: 48px;
}
.calendar-day:hover { background: var(--color-bg-hover); }
.calendar-day.other { opacity: 0.35; }
.calendar-day.today { background: var(--color-primary-bg); }
.calendar-day.today .day-number { color: var(--color-primary); font-weight: 700; }
.calendar-day.selected { border-color: var(--color-primary); background: var(--color-primary-bg); }
.calendar-day.hasTasks { background: var(--color-success-bg); }
.calendar-day.hasTasks.selected { background: var(--color-primary-bg); }
.day-number { font-size: 14px; font-weight: 500; line-height: 1.4; }
.day-dots { display: flex; gap: 2px; margin-top: 2px; }
.day-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--color-success); }
.day-task-count {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 10px;
  color: var(--color-success);
  font-weight: 600;
}

.task-list { display: flex; flex-direction: column; gap: 8px; }
.cal-task-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-bg);
}
.cal-task-item.completed { opacity: 0.6; }
.task-checkbox {
  width: 20px; height: 20px;
  border: 2px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
}
.cal-task-item.completed .task-checkbox {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
.task-content { flex: 1; }
.task-header { display: flex; justify-content: space-between; align-items: center; }
.task-title { font-size: 14px; font-weight: 500; }
.cal-task-item.completed .task-title { text-decoration: line-through; color: var(--color-text-tertiary); }
.cal-task-item.isPlan { border-left: 3px solid var(--color-primary); }
.tag-plan { background: #E0E7FF; color: #4338CA; font-size: 11px; }
.task-tags { display: flex; gap: 4px; }
.task-progress { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.task-progress .progress-bar { flex: 1; }
.progress-text { font-size: 12px; color: var(--color-text-tertiary); min-width: 32px; }

.quick-actions { display: flex; gap: 12px; }
.quick-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.quick-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}
.quick-icon { font-size: 28px; }

.empty-state { padding: 24px; text-align: center; }
.empty-state-icon { font-size: 48px; opacity: 0.5; margin-bottom: 8px; }

.toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--color-text-primary); color: white;
  padding: 10px 20px; border-radius: var(--radius-md);
  font-size: 14px; box-shadow: var(--shadow-lg); z-index: 2000;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.btn-ghost.active {
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
}

/* ===== 响应式：统计卡 4 列 → 2 列 → 1 列 ===== */
@media (max-width: 900px) {
  .data-overview { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 520px) {
  .data-overview { grid-template-columns: 1fr; }
}
</style>
