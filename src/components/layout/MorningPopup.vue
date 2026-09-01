<template>
  <div class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => handleClose())">
    <div class="morning-popup modal-content">
      <div class="popup-header">
        <div class="popup-date">{{ greeting }}！{{ dateDisplay }}</div>
        <div class="popup-subtitle">新的一天，新的成长</div>
      </div>

      <div class="popup-body">
        <!-- 今日科研运势预览 -->
        <div class="popup-section">
          <div class="section-title"><AppIcon name="sparkles" />  今日科研运势</div>
          <div class="section-content">
            <div class="fortune-stars">
              <span v-for="i in 5" :key="i" :class="{ active: i <= todayFortune }"><AppIcon name="star" /> </span>
            </div>
            <div class="fortune-text">{{ fortuneText }}</div>
          </div>
        </div>

        <!-- 学业进度总览 -->
        <div class="popup-section">
          <div class="section-title"><AppIcon name="book" />  学业进度总览</div>
          <div class="section-content">
            <div class="progress-rows-mini">
              <div v-for="item in progressBreakdown" :key="item.name" class="progress-row-item">
                <span class="progress-row-label">{{ item.name }}</span>
                <div class="progress-row-bar-wrap">
                  <div class="progress-row-bar" :style="{ background: item.color + '22' }">
                    <div class="progress-row-fill" :style="{ width: item.value + '%', background: item.color }"></div>
                  </div>
                </div>
                <span class="progress-row-val">{{ item.value }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 论文概览 -->
        <div class="popup-section">
          <div class="section-title">
            <AppIcon name="file-text" />  论文概览
            <span class="section-count">共 {{ paperLibraryStore.papers.length }} 篇</span>
          </div>
          <div class="section-content">
            <div class="paper-status-dots">
              <div v-for="s in paperLibraryStore.sortedStatuses" :key="s.id" class="paper-dot-item"
                v-show="paperLibraryStore.statusSummary[s.id]?.count > 0">
                <span class="ps-dot" :style="{ background: s.color }"></span>
                <span class="ps-name">{{ s.name }}</span>
                <span class="ps-count">{{ paperLibraryStore.statusSummary[s.id].count }}</span>
              </div>
            </div>
            <div class="paper-mini-list">
              <div v-for="paper in recentLibraryPapers" :key="paper.id" class="paper-mini-item">
                <span class="paper-status-dot" :style="{ background: getStatusColor(paper.status) }"></span>
                <span class="paper-title">{{ paper.title }}</span>
                <span v-if="paper.journal" class="paper-journal">{{ paper.journal }}</span>
              </div>
            </div>
            <div v-if="paperLibraryStore.papers.length === 0" class="empty-hint">
              暂无论文记录，开启美好一天后去论文中心添加吧
            </div>
          </div>
        </div>
      </div>

      <div class="popup-footer">
        <button class="btn btn-primary btn-lg" @click="handleClose">开启美好一天</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore, usePaperLibraryStore } from '../../stores'
import dayjs from 'dayjs'

const emit = defineEmits(['close'])

const settingsStore = useSettingsStore()
const paperLibraryStore = usePaperLibraryStore()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const dateDisplay = computed(() => dayjs().format('YYYY年MM月DD日 dddd'))

const progressBreakdown = computed(() => settingsStore.academicBreakdown)

const recentLibraryPapers = computed(() => {
  return [...paperLibraryStore.papers].sort((a, b) => {
    return (b.createdAt || '').localeCompare(a.createdAt || '')
  }).slice(0, 3)
})

function getStatusColor(statusId) {
  return paperLibraryStore.statuses.find(s => s.id === statusId)?.color || '#6B7280'
}

const todayFortune = computed(() => {
  const seed = dayjs().format('YYYYMMDD')
  return (parseInt(seed) % 5) + 1
})

const fortuneTexts = [
  '今日宜专注写作，灵感如泉涌。',
  '宜处理数据，逻辑清晰不宜急躁。',
  '宜阅读文献，开阔思路。',
  '宜与导师沟通，坦诚交流有收获。',
  '宜休息调整，磨刀不误砍柴工。',
]
const fortuneText = computed(() => fortuneTexts[todayFortune.value - 1] || fortuneTexts[0])

function handleClose() {
  emit('close')
}
</script>

<style scoped>
.morning-popup {
  max-width: 520px;
}

.popup-header {
  padding: 24px 28px 16px;
  background: linear-gradient(135deg, var(--color-primary-bg), white);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}
.popup-date {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
}
.popup-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.popup-body {
  padding: 8px 28px 20px;
}

.popup-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border-light);
}
.popup-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-count {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 400;
}
.section-content {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.fortune-stars {
  font-size: 18px;
  margin-bottom: 4px;
}
.fortune-stars span {
  opacity: 0.3;
}
.fortune-stars span.active {
  opacity: 1;
}
.fortune-text {
  color: var(--color-text-secondary);
  font-size: 13px;
}

/* 学业进度 */
.progress-rows-mini {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.progress-row-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-row-label {
  width: 48px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  text-align: right;
}
.progress-row-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}
.progress-row-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}
.progress-row-fill {
  height: 100%;
  border-radius: 4px;
  transition: width var(--transition-normal);
  min-width: 2px;
}
.progress-row-val {
  width: 34px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: right;
  flex-shrink: 0;
}

/* 论文概览 */
.paper-status-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-bottom: 10px;
}
.paper-dot-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
}
.ps-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ps-name {
  color: var(--color-text-secondary);
}
.ps-count {
  font-weight: 600;
  color: var(--color-text-primary);
}
.paper-mini-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.paper-mini-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  font-size: 13px;
}
.paper-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.paper-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
  font-weight: 500;
}
.paper-journal {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-hover);
  padding: 1px 6px;
  border-radius: var(--radius-full);
}
.empty-hint {
  font-size: 12px;
  color: var(--color-text-tertiary);
  text-align: center;
  padding: 12px 0;
}

.popup-footer {
  padding: 16px 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
</style>