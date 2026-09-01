<template>
  <div class="plan-page">
    <!-- Tab 切换：胶囊样式 -->
    <div class="tab-bar">
      <div class="tab-pill">
        <button v-for="tab in tabs" :key="tab.id" class="tab-btn"
          :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          {{ tab.name }}
        </button>
      </div>
    </div>

    <!-- ==================== 总览 ==================== -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <div class="overview-grid">
        <!-- 左：状态占比饼图 -->
        <div class="card section-card chart-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="bar-chart" />  任务状态占比</h2>
            <span class="text-xs text-tertiary">共 {{ planStore.plans.length }} 项</span>
          </div>
          <div class="chart-wrap">
            <div ref="chartRef" class="chart-el"></div>
          </div>
          <div class="chart-legend">
            <div v-for="s in statusItems" :key="s.id" class="legend-item">
              <span class="legend-dot" :style="{ background: s.color }"></span>
              <span class="legend-name">{{ s.name }}</span>
              <span class="legend-count">{{ s.count }}</span>
            </div>
          </div>
        </div>

        <!-- 右：任务数量统计卡片 -->
        <div class="stats-section">
          <div class="stat-card stat-total clickable" @click="openStatDetail('total')">
            <div class="stat-label">总任务</div>
            <div class="stat-num" style="color:var(--color-primary);">{{ planStore.plans.length }}</div>
          </div>
          <div class="stat-card stat-completed clickable" @click="openStatDetail('completed')">
            <div class="stat-label">已完成</div>
            <div class="stat-num" style="color:var(--color-success);">{{ completedCount }}</div>
          </div>
          <div class="stat-card stat-active clickable" @click="openStatDetail('incomplete')">
            <div class="stat-label">未完成</div>
            <div class="stat-num" style="color:var(--color-danger);">{{ incompleteCount }}</div>
          </div>
          <div class="stat-card stat-overdue clickable" @click="openStatDetail('overdue')">
            <div class="stat-label">已逾期</div>
            <div class="stat-num" style="color:#F59E0B;">{{ overdueCount }}</div>
          </div>
          <div class="stat-card stat-today clickable" @click="openStatDetail('todayDue')">
            <div class="stat-label">今日需完成</div>
            <div class="stat-num" style="color:#8B5CF6;">{{ todayDueCount }}</div>
          </div>
          <div class="stat-card stat-weekly clickable" @click="openStatDetail('weeklyNew')">
            <div class="stat-label">本周新增</div>
            <div class="stat-num" style="color:#14B8A6;">{{ weeklyNewCount }}</div>
          </div>
          <div class="stat-card clickable" @click="activeTab = 'daily'">
            <div class="stat-label">连续打卡</div>
            <div class="stat-num" style="color:#10B981;">{{ currentStreak }}天</div>
          </div>
          <div class="stat-card clickable" @click="activeTab = 'daily'">
            <div class="stat-label">本周达成率</div>
            <div class="stat-num" style="color:#185FA5;">{{ weeklyRate }}%</div>
          </div>
        </div>
      </div>

      <!-- 总览下方：左半侧近期任务 + 右半侧最近打卡 -->
      <div class="overview-bottom-grid">
        <!-- 左半侧：近期任务 -->
        <div class="card section-card recent-plans-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="file-edit" />  近期任务</h2>
            <button class="btn btn-sm btn-ghost" @click="activeTab = 'library'">查看全部 →</button>
          </div>
          <div v-if="recentPlans.length === 0" class="empty-state" style="padding:24px;">
            <p>暂无计划数据</p>
          </div>
          <div v-else class="recent-plan-list">
            <div v-for="plan in recentPlans" :key="plan.id" class="recent-plan-item"
              :class="{ 'row-overdue': plan.status === 'overdue' }" @click="openEditPlan(plan)">
              <div class="rp-left">
                <span class="rp-seq">#{{ plan.seq }}</span>
                <span class="status-tag" :style="getStatusStyle(plan.status)">{{ getStatusName(plan.status) }}</span>
                <span class="rp-title">{{ plan.title }}</span>
              </div>
              <div class="rp-right">
                <span class="rp-category" :style="getCategoryStyle(plan.category)">{{ getCategoryName(plan.category) }}</span>
                <span class="rp-level" :style="getLevelStyle(plan.level)">{{ getLevelName(plan.level) }}</span>
                <span class="rp-priority" :style="getPriorityStyle(plan.priority)">{{ getPriorityName(plan.priority) }}</span>
                <span class="rp-time" v-if="plan.endDate">截止：{{ formatTime(plan.endDate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右半侧：最近打卡（今日总结） -->
        <div class="card section-card recent-summaries-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="file-text" />  最近打卡</h2>
            <button class="btn btn-sm btn-ghost" @click="activeTab = 'daily'">前往打卡 →</button>
          </div>
          <div v-if="recentDailySummaries.length === 0" class="empty-state" style="padding:24px;">
            <p>暂无打卡总结记录</p>
          </div>
          <div v-else class="recent-summary-list">
            <div v-for="s in recentDailySummaries" :key="s.id" class="recent-summary-item">
              <div class="rs-head">
                <span class="rs-date">{{ s.date }}</span>
                <span v-if="s.writtenAt" class="rs-time">{{ s.writtenAt.slice(11, 16) }}</span>
              </div>
              <div class="rs-section">
                <span class="rs-label">进展</span>
                <span class="rs-text">{{ s.progress || '—' }}</span>
              </div>
              <div v-if="s.problems" class="rs-section">
                <span class="rs-label">问题</span>
                <span class="rs-text">{{ s.problems }}</span>
              </div>
              <div v-if="s.tomorrow" class="rs-section">
                <span class="rs-label">明日</span>
                <span class="rs-text">{{ s.tomorrow }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计明细弹窗 -->
      <div v-if="showStatDetail" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showStatDetail = false })">
        <div class="modal-content stat-detail-modal">
          <button class="soft-btn-close modal-close-corner" @click="showStatDetail = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <div class="modal-body" style="padding: 24px;">
            <h3 style="margin-bottom: 4px;">{{ statDetailTitle }}</h3>
            <p class="text-xs text-tertiary" style="margin-bottom: 16px;">共 {{ statDetailPlans.length }} 项 · 点击任意条目可编辑</p>
            <div v-if="statDetailPlans.length === 0" class="empty-state" style="padding: 32px 0;">
              <div class="empty-state-icon"><AppIcon name="file-text" /> </div>
              <p>暂无相关计划</p>
            </div>
            <div v-else class="stat-detail-list">
              <div v-for="plan in statDetailPlans" :key="plan.id" class="stat-detail-item"
                :class="{ 'item-overdue': plan.status === 'overdue', 'item-completed': plan.status === 'completed' }"
                @click="openEditPlan(plan); showStatDetail = false">
                <span class="sd-seq">#{{ plan.seq }}</span>
                <span class="status-tag" :style="getStatusStyle(plan.status)">{{ getStatusName(plan.status) }}</span>
                <span class="sd-title">{{ plan.title }}</span>
                <span class="sd-deadline" v-if="plan.endDate">截止 {{ formatTime(plan.endDate) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 每日打卡 ==================== -->
    <div v-if="activeTab === 'daily'" class="tab-content daily-tab">
      <!-- 顶部快捷操作按钮 -->
      <div class="daily-top-actions">
        <h2 class="daily-top-title">计划底线库</h2>
        <div class="daily-top-btns">
          <button class="header-btn" @click="openTaskModal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 9h18"/><path d="M9 14l2 2 4-4"/></svg>
            今日底线任务添加
          </button>
          <button class="header-btn" @click="openDailySummaryModal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            今日总结添加
          </button>
          <button class="header-btn" @click="openWeeklySummaryModal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 9h18"/><path d="M8 14h2M8 18h2M12 14h4M12 18h4"/></svg>
            本周总结添加
          </button>
          <button class="header-btn" @click="showDailyCheckinSettings = true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            每日打卡设置
          </button>
          <button class="header-btn" @click="showAllSummariesModal = true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>
            查看所有今日总结
          </button>
        </div>
      </div>

      <div class="daily-grid">
        <!-- 今日底线任务 -->
        <div class="card section-card daily-card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <h2 class="card-title">{{ dailyViewIsToday ? '今日底线任务' : '底线任务' }}</h2>
              <span class="text-xs text-tertiary">{{ dailyViewDateLabel }}</span>
            </div>
            <div class="view-switch">
              <button class="view-switch-btn" @click="shiftDailyView(-1)" title="前一天">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button v-if="!dailyViewIsToday" class="view-switch-today" @click="resetDailyView">回到今天</button>
              <button class="view-switch-btn" :disabled="dailyViewIsToday" @click="shiftDailyView(1)" title="后一天">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
          <div class="daily-progress-row">
            <span class="daily-progress-num">{{ dailyCompletedCount }}/{{ dailyTotalCount }}</span>
            <div class="daily-progress-bar">
              <div class="daily-progress-fill" :style="{ width: dailyProgressPercent + '%' }"></div>
            </div>
            <span class="daily-progress-status" :style="dailyGoalMetStyle">{{ dailyGoalMetText }}</span>
          </div>
          <div v-if="currentStreak > 0" class="daily-streak-bar">
            <span>连续达成 {{ currentStreak }} 天</span>
            <span class="text-xs">本周达成率 {{ weeklyRate }}%</span>
          </div>

          <div class="daily-task-list">
            <div v-for="task in todayTasks" :key="task.id" class="daily-task-item clickable"
              :class="{ 'task-completed': task.completed, 'task-abandoned': taskState(task) === 'abandoned' }" @click="openTaskDetail(task)">
              <div class="dt-left">
                <span class="status-tag dt-status-toggle" :style="getTaskStateTagStyle(task)" @click.stop="toggleTaskStateMenu(task, $event)">
                  {{ getTaskStateName(task) }}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
                </span>
                <span class="dt-title" :class="{ 'line-through': task.completed }">{{ task.title }}</span>
                <span v-if="task.planId && linkedPlanOf(task.planId)" class="dt-tag dt-plan-tag">计划：{{ linkedPlanOf(task.planId).title }}</span>
                <span v-else-if="task.planId" class="dt-tag dt-plan-tag dt-plan-removed">计划已删除</span>
                <span v-if="task.source === 'tomorrowPlan'" class="dt-tag dt-plan-tag" style="background: rgba(16,185,129,0.12); color: #059669;">来自昨日明日计划</span>
              </div>
              <div class="dt-right">
                <span v-if="!task.planId" class="dt-tag" style="background: var(--color-bg); color: var(--color-text-tertiary);">临时任务</span>
                <button class="dt-action" @click.stop="openEditTaskModal(task)" title="编辑">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                </button>
                <button class="dt-action dt-delete" @click.stop="deleteTask(task)" title="删除">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <div v-if="todayTasks.length === 0" class="empty-state" style="padding: 24px 0;">
              <p>{{ dailyViewIsToday ? '今天还没有设置底线任务' : '该日暂无底线任务' }}</p>
            </div>
          </div>
        </div>

        <!-- 今日总结 -->
        <div class="card section-card daily-card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <h2 class="card-title">{{ dailyViewIsToday ? '今日总结' : '日总结' }}</h2>
              <span class="text-xs text-tertiary">{{ dailyViewDateLabel }}</span>
              <span class="daily-status-badge" :class="dailySummaryFilled ? 'filled' : 'empty'">{{ dailySummaryFilled ? '已填写' : '未填写' }}</span>
            </div>
            <div class="view-switch">
              <button class="dt-action" @click="openDailySummaryEdit" title="编辑总结">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              </button>
              <button class="view-switch-btn" @click="shiftDailyView(-1)" title="前一天">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button v-if="!dailyViewIsToday" class="view-switch-today" @click="resetDailyView">回到今天</button>
              <button class="view-switch-btn" :disabled="dailyViewIsToday" @click="shiftDailyView(1)" title="后一天">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
          <div class="daily-form">
            <div class="form-group">
              <label class="form-label">今日工作进展</label>
              <div class="daily-display-box">{{ currentDailySummary?.progress || '暂无记录' }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">遇到的问题</label>
              <div class="daily-display-box">{{ currentDailySummary?.problems || '暂无记录' }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">明日计划</label>
              <div class="daily-display-box">{{ currentDailySummary?.tomorrow || '暂无记录' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 本周总结 -->
      <div class="card section-card weekly-card">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
            <h2 class="card-title">{{ isCurrentWeek ? '本周总结' : '周总结' }}</h2>
            <span class="text-xs text-tertiary" style="font-weight: 400;">{{ currentWeekRange }}</span>
            <span class="daily-status-badge" :class="weeklySummaryFilled ? 'filled' : 'empty'">{{ weeklySummaryFilled ? '已填写' : '待填写' }}</span>
          </div>
          <div class="view-switch">
            <button class="view-switch-btn" @click="shiftWeeklyView(-1)" title="上一周">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button v-if="!isCurrentWeek" class="view-switch-today" @click="resetWeeklyView">回到本周</button>
            <button class="view-switch-btn" :disabled="isCurrentWeek" @click="shiftWeeklyView(1)" title="下一周">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
        <div class="weekly-days-row">
          <div v-for="(d, i) in weekDates" :key="i" class="weekly-day-cell" :class="{ today: d.date === todayStrVal, future: d.isFuture }">
            <div class="weekly-day-name">{{ d.shortName }}</div>
            <div class="weekly-day-ratio" :style="{ color: d.color }">{{ d.ratioText }}</div>
          </div>
        </div>
        <div class="weekly-stats-row">
          <div class="weekly-stat">
            <span class="weekly-stat-label">本周达成率</span>
            <span class="weekly-stat-num" style="color: #3B6D11;">{{ weeklyRate }}%</span>
          </div>
          <div class="weekly-stat">
            <span class="weekly-stat-label">最长连续</span>
            <span class="weekly-stat-num" style="color: #185FA5;">{{ currentStreak }}天</span>
          </div>
          <div class="weekly-stat">
            <span class="weekly-stat-label">完成底线任务</span>
            <span class="weekly-stat-num">{{ weekCompleted }}/{{ weekTotal }}</span>
          </div>
        </div>
        <div class="daily-form" style="margin-top: 16px;">
          <div class="form-group">
            <label class="form-label">本周工作进展</label>
            <div class="daily-display-box">{{ currentWeeklySummary?.progress || '暂无记录' }}</div>
          </div>
          <div class="form-group">
            <label class="form-label">下周计划</label>
            <div class="daily-display-box">{{ currentWeeklySummary?.nextWeek || '暂无记录' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 计划列表 ==================== -->
    <div v-if="activeTab === 'library'" class="tab-content">
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="file-text" />  计划列表</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="showPlanConfigModal = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              计划/任务配置
            </button>
            <div class="export-dropdown">
              <button class="header-btn" @click="toggleExportMenu">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出
              </button>
              <div v-if="showExportMenu" class="export-menu" @click.stop>
                <button @click="exportMarkdown"><AppIcon name="file-edit" />  导出 Markdown</button>
                <button @click="exportPdf"><AppIcon name="file-text" />  导出 PDF</button>
              </div>
            </div>
            <button class="header-btn header-btn-primary" @click="openAddPlan">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加计划
            </button>
          </div>
        </div>

        <!-- 搜索和筛选 -->
        <div class="filter-bar">
          <div class="filter-row">
            <input class="input" v-model="searchQuery" placeholder="搜索任务主题、描述、标签…" style="flex:1;" />
          </div>
          <div class="filter-row">
            <!-- 排序：放在筛选器最左侧 -->
            <GlassSelect
              v-model="sortField"
              select-class="input filter-select"
              :options="[
                { value: '', label: '默认排序' },
                { value: 'acceptTime', label: '接受任务时间' },
                { value: 'endDate', label: '任务结束时间' },
                { value: 'category', label: '分类' },
                { value: 'priority', label: '优先级' }
              ]"
              placeholder="默认排序"
            />
            <button class="btn btn-sm btn-ghost sort-dir-btn" @click="toggleSortDirection" title="切换升/降序">
              {{ sortDirection === 'asc' ? '↑ 升序' : '↓ 降序' }}
            </button>

            <GlassSelect
              v-model="filterStatus"
              select-class="input filter-select"
              :options="[
                { value: '', label: '全部状态' },
                ...sortedPlanStatuses.map(s => ({ value: s.id, label: s.name }))
              ]"
              placeholder="全部状态"
            />
            <GlassSelect
              v-model="filterCategory"
              select-class="input filter-select"
              :options="[
                { value: '', label: '全部分类' },
                ...sortedPlanCategories.map(c => ({ value: c.id, label: c.name }))
              ]"
              placeholder="全部分类"
            />
            <GlassSelect
              v-model="filterLevel"
              select-class="input filter-select"
              :options="[
                { value: '', label: '全部层级' },
                ...sortedPlanLevels.map(l => ({ value: l.id, label: l.name }))
              ]"
              placeholder="全部层级"
            />
            <GlassSelect
              v-model="filterPriority"
              select-class="input filter-select"
              :options="[
                { value: '', label: '全部优先级' },
                ...sortedPlanPriorities.map(p => ({ value: String(p.value), label: p.name }))
              ]"
              placeholder="全部优先级"
            />
            <span class="plan-count-label">共 {{ filteredPlans.length }} 项</span>
            <button class="btn btn-sm btn-ghost" v-if="hasActiveFilters" @click="clearFilters">清除筛选</button>
          </div>
        </div>

        <!-- 表格 -->
        <div class="plan-table-wrapper" @wheel.passive="handleTableWheel">
          <table class="plan-table">
            <thead>
              <tr>
                <th v-if="planColumnVisible('seq')" class="col-seq">编号</th>
                <th v-if="planColumnVisible('status')" class="col-status">状态</th>
                <th v-if="planColumnVisible('title')" class="col-title">任务主题</th>
                <th v-if="planColumnVisible('acceptTime')" class="col-accept-time">接受任务时间</th>
                <th v-if="planColumnVisible('endDate')" class="col-end-date">任务结束时间</th>
                <th v-if="planColumnVisible('category')" class="col-category">分类</th>
                <th v-if="planColumnVisible('level')" class="col-level">层级</th>
                <th v-if="planColumnVisible('priority')" class="col-priority">优先级</th>
                <template v-for="i in 6" :key="'sub'+i">
                  <th v-if="planColumnVisible('subtask' + i)" class="col-subtask">子任务{{ i }}</th>
                </template>
                <th v-if="planColumnVisible('actions')" class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredPlans.length === 0">
                <td :colspan="planVisibleColumnCount" style="text-align:center;padding:40px;color:var(--color-text-tertiary);">
                  暂无计划数据，点击「添加计划」开始
                </td>
              </tr>
              <tr v-for="plan in filteredPlans" :key="plan.id"
                :class="{ 'row-overdue': plan.status === 'overdue' }">
                <td v-if="planColumnVisible('seq')" class="col-seq">{{ plan.seq }}</td>
                <td v-if="planColumnVisible('status')" class="col-status">
                  <div class="cell-picker-wrap">
                    <span class="status-tag" :style="getStatusStyle(plan.status)" @click.stop="openCellPicker(plan, 'status', $event)">{{ getStatusName(plan.status) }}</span>
                    <Teleport to="body">
                      <div v-if="picker.planId === plan.id && picker.type === 'status'" class="cell-picker" :style="picker.style" @click.stop>
                        <div v-for="s in sortedPlanStatuses" :key="s.id" class="cell-picker-item" :class="{ active: plan.status === s.id }" @click="updatePlanField(plan, 'status', s.id)">
                          <span class="cell-picker-dot" :style="{ background: s.color }"></span>
                          <span class="cell-picker-label">{{ s.name }}</span>
                        </div>
                      </div>
                    </Teleport>
                  </div>
                </td>
                <td v-if="planColumnVisible('title')" class="col-title">
                  <div class="plan-title-cell">
                    <span class="plan-title-text">{{ plan.title }}</span>
                    <span v-if="plan.description" class="plan-desc-preview">{{ plan.description.slice(0, 40) }}{{ plan.description.length > 40 ? '…' : '' }}</span>
                  </div>
                </td>
                <td v-if="planColumnVisible('acceptTime')" class="col-accept-time">{{ formatTime(plan.acceptTime || plan.createdAt) }}</td>
                <td v-if="planColumnVisible('endDate')" class="col-end-date">{{ plan.endDate ? formatTime(plan.endDate) : '—' }}</td>
                <td v-if="planColumnVisible('category')" class="col-category">
                  <div class="cell-picker-wrap">
                    <span class="category-tag" :style="getCategoryStyle(plan.category)" @click.stop="openCellPicker(plan, 'category', $event)">{{ getCategoryName(plan.category) }}</span>
                    <Teleport to="body">
                      <div v-if="picker.planId === plan.id && picker.type === 'category'" class="cell-picker" :style="picker.style" @click.stop>
                        <div v-for="c in sortedPlanCategories" :key="c.id" class="cell-picker-item" :class="{ active: normalizeCategory(plan.category) === c.id }" @click="updatePlanField(plan, 'category', c.id)">
                          <span class="cell-picker-dot" :style="{ background: c.color }"></span>
                          <span class="cell-picker-label">{{ c.name }}</span>
                        </div>
                      </div>
                    </Teleport>
                  </div>
                </td>
                <td v-if="planColumnVisible('level')" class="col-level">
                  <div class="cell-picker-wrap">
                    <span class="level-tag" :style="getLevelStyle(plan.level)" @click.stop="openCellPicker(plan, 'level', $event)">{{ getLevelName(plan.level) }}</span>
                    <Teleport to="body">
                      <div v-if="picker.planId === plan.id && picker.type === 'level'" class="cell-picker" :style="picker.style" @click.stop>
                        <div v-for="l in sortedPlanLevels" :key="l.id" class="cell-picker-item" :class="{ active: plan.level === l.id }" @click="updatePlanField(plan, 'level', l.id)">
                          <span class="cell-picker-dot" :style="{ background: l.color }"></span>
                          <span class="cell-picker-label">{{ l.name }}</span>
                        </div>
                      </div>
                    </Teleport>
                  </div>
                </td>
                <td v-if="planColumnVisible('priority')" class="col-priority">
                  <div class="cell-picker-wrap">
                    <span class="priority-tag" :style="getPriorityStyle(plan.priority)" @click.stop="openCellPicker(plan, 'priority', $event)">{{ getPriorityName(plan.priority) }}</span>
                    <Teleport to="body">
                      <div v-if="picker.planId === plan.id && picker.type === 'priority'" class="cell-picker" :style="picker.style" @click.stop>
                        <div v-for="p in sortedPlanPriorities" :key="p.id" class="cell-picker-item" :class="{ active: plan.priority === p.value }" @click="updatePlanField(plan, 'priority', p.value)">
                          <span class="cell-picker-dot" :style="{ background: p.color }"></span>
                          <span class="cell-picker-label">{{ p.name }}</span>
                        </div>
                      </div>
                    </Teleport>
                  </div>
                </td>
                <template v-for="i in 6" :key="'s'+i">
                <td v-if="planColumnVisible('subtask' + i)" class="col-subtask">
                  <div class="subtask-cell" :class="{ filled: subAt(plan, i - 1).color }"
                    :style="subtaskCellStyle(plan, i - 1)"
                    @click.stop="openSubtaskPicker(plan, i - 1, $event)"
                    :title="subAt(plan, i - 1).date ? '截止时间：' + subAt(plan, i - 1).date : ''">
                    <span class="subtask-text">{{ subAt(plan, i - 1).text || '—' }}</span>
                    <span v-if="subAt(plan, i - 1).date" class="subtask-date">{{ formatSubtaskDate(subAt(plan, i - 1).date) }}</span>
                  </div>
                  <Teleport to="body">
                    <div v-if="subtaskPicker.planId === plan.id && subtaskPicker.index === i - 1" class="cell-picker subtask-picker" :style="subtaskPicker.style" @click.stop>
                      <div v-for="c in subtaskColors" :key="c.id" class="subtask-color-item" :class="{ active: subAt(plan, i - 1).color === c.color }" @click="selectSubtaskColor(plan, i - 1, c.color)">
                        <span class="subtask-color-dot" :style="{ background: c.color }"></span>
                        <span class="subtask-color-label">{{ c.name }}</span>
                      </div>
                      <div class="subtask-color-item custom-item">
                        <span class="subtask-color-dot" :style="{ background: subtaskCustom }"></span>
                        <span class="subtask-color-label">自定义</span>
                        <input type="color" class="subtask-color-input" v-model="subtaskCustom" @change="selectSubtaskColor(plan, i - 1, subtaskCustom)" title="自定义填充色" />
                      </div>
                      <div class="picker-divider"></div>
                      <div class="subtask-date-item">
                        <span class="subtask-color-dot" style="background:transparent;border:none;"><AppIcon name="calendar" /> </span>
                        <label class="subtask-color-label">截止时间</label>
                        <input type="datetime-local" step="1" class="subtask-date-input"
                          :value="subtaskDateInput"
                          @input="subtaskDateInput = $event.target.value"
                          @change="updateSubtaskDate(plan, i - 1, $event.target.value)" />
                      </div>
                      <div class="picker-divider"></div>
                      <div class="subtask-color-item clear-item" @click="selectSubtaskColor(plan, i - 1, '')">
                        <span class="subtask-color-dot clear-dot">✕</span>
                        <span class="subtask-color-label">清除填充</span>
                      </div>
                    </div>
                  </Teleport>
                </td>
                </template>
                <td v-if="planColumnVisible('actions')" class="col-actions">
                  <button class="btn btn-sm btn-ghost" @click="openEditPlan(plan)" title="编辑">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="confirmDeletePlan(plan)" title="删除" style="color:var(--color-danger);">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ==================== 日历视图 ==================== -->
    <div v-if="activeTab === 'calendar'" class="tab-content">
      <PlanCalendar @add="onCalendarAdd" @edit="onCalendarEdit" />
    </div>

    <!-- ==================== 添加/编辑计划弹窗 ==================== -->
    <div v-if="showPlanModal" class="modal-overlay plan-modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showPlanModal = false })">
      <div class="modal-content" style="max-width: 680px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">{{ editingPlanId ? '编辑计划' : '添加计划' }}</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-primary" @click="savePlan" :title="editingPlanId ? '保存' : '添加'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ editingPlanId ? '保存' : '添加' }}
              </button>
              <button class="soft-btn-close" @click="showPlanModal = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- 任务主题 -->
            <div class="form-group">
              <label class="form-label">任务主题 <span style="color:var(--color-danger);">*</span></label>
              <input class="input" v-model="planForm.title" placeholder="输入任务主题" />
            </div>
            <!-- 描述 -->
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea class="input" v-model="planForm.description" placeholder="任务描述（可选）" rows="2"></textarea>
            </div>
            <!-- 分类 + 层级 + 优先级 -->
            <div style="display: flex; gap: 10px;">
              <div class="form-group" style="flex:1;">
                <label class="form-label">分类</label>
                <GlassSelect
                  v-model="planForm.category"
                  select-class="input"
                  :options="sortedPlanCategories.map(c => ({ value: c.id, label: c.name }))"
                />
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">层级</label>
                <GlassSelect
                  v-model="planForm.level"
                  select-class="input"
                  :options="sortedPlanLevels.map(l => ({ value: l.id, label: l.name }))"
                />
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">优先级</label>
                <GlassSelect
                  v-model.number="planForm.priority"
                  select-class="input"
                  :options="sortedPlanPriorities.map(p => ({ value: p.value, label: p.name }))"
                />
              </div>
            </div>
            <!-- 时间 -->
            <div style="display: flex; gap: 10px;">
              <div class="form-group" style="flex:1;">
                <label class="form-label">接受任务时间</label>
                <input class="input" type="datetime-local" v-model="planForm.acceptTime" />
              </div>
              <div class="form-group" style="flex:1;">
                <label class="form-label">任务结束时间</label>
                <input class="input" type="datetime-local" v-model="planForm.endDate" />
              </div>
            </div>
            <!-- 状态（仅编辑时） -->
            <div v-if="editingPlanId" class="form-group">
              <label class="form-label">状态</label>
              <GlassSelect
                v-model="planForm.status"
                select-class="input"
                :options="sortedPlanStatuses.map(s => ({ value: s.id, label: s.name }))"
              />
            </div>
            <!-- 子任务 -->
            <div class="form-group">
              <label class="form-label">子任务</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <div v-for="i in 6" :key="'sub'+i" style="display:flex;align-items:center;gap:4px;">
                  <span style="font-size:11px;color:var(--color-text-tertiary);min-width:28px;">子{{ i }}</span>
                  <input class="input" v-model="planForm.subtasks[i - 1].text" :placeholder="'子任务 ' + i" style="flex:1;font-size:12px;" />
                </div>
              </div>
            </div>
            <!-- 底部仅保留删除 -->
            <div style="display: flex; gap: 8px; justify-content: space-between; margin-top: 8px;">
              <button v-if="editingPlanId" class="btn btn-sm btn-danger" @click="deletePlanFromEdit"><AppIcon name="trash" />  删除</button>
              <div v-else></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 计划/任务配置弹窗 ==================== -->
    <div v-if="showPlanConfigModal" class="modal-overlay plan-config-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showPlanConfigModal = false })">
      <div class="modal-content config-modal">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title"><AppIcon name="settings" />  计划 / 任务配置</h3>
            <button class="soft-btn-close" @click="showPlanConfigModal = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <p class="text-xs text-tertiary" style="margin-bottom: 16px;">自定义计划与任务的分类、层级、优先级及子任务填充色。修改即时生效。</p>
          <div v-for="grp in planConfigGroups" :key="grp.title" class="cfg-group">
            <h4 class="cfg-group-title">
              <AppIcon :name="grp.icon" :size="16" />
              {{ grp.title }}
            </h4>
            <div class="cfg-grid">
              <div v-for="sec in grp.sections" :key="sec.key" class="cfg-block">
                <div class="cfg-block-head">
                  <h5 class="cfg-block-title">{{ sec.title }}</h5>
                  <div class="cfg-block-actions">
                    <button class="soft-btn btn-sm" @click="addPlanConfigItem(sec.key, sec.withValue, sec.label)">+ 添加</button>
                    <button v-if="sec.key === 'subtaskColors'" class="soft-btn btn-sm" @click="resetSubtaskColorsAll">恢复默认</button>
                    <button v-else-if="sec.key.startsWith('plan')" class="soft-btn btn-sm" @click="resetPlanConfigAll">恢复默认</button>
                    <button v-else class="soft-btn btn-sm" @click="resetTaskConfigAll">恢复默认</button>
                  </div>
                </div>
                <div class="cfg-list">
                  <div v-for="(item, i) in settingsStore[sec.key]" :key="item.id" class="cfg-item">
                    <input type="color" class="cfg-color" :value="item.color" @input="e => updatePlanConfigItem(sec.key, i, { color: e.target.value })" title="颜色" />
                    <input class="input cfg-name" :value="item.name" @input="e => updatePlanConfigItem(sec.key, i, { name: e.target.value })" placeholder="名称" />
                    <input v-if="sec.withValue" type="number" class="input cfg-val" :value="item.value" @input="e => updatePlanConfigItem(sec.key, i, { value: parseInt(e.target.value) || 0 })" title="数值" />
                    <button class="soft-btn-icon" @click="movePlanConfigItem(sec.key, i, -1)" :disabled="i === 0" title="上移">↑</button>
                    <button class="soft-btn-icon" @click="movePlanConfigItem(sec.key, i, 1)" :disabled="i === settingsStore[sec.key].length - 1" title="下移">↓</button>
                    <button class="soft-btn-icon danger" @click="deletePlanConfigItem(sec.key, i, sec.label)" title="删除">✕</button>
                  </div>
                  <div v-if="settingsStore[sec.key].length === 0" class="cfg-empty">暂无，点击「+ 添加」</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 计划库消息中心提醒设置 -->
          <div class="cfg-group">
            <h4 class="cfg-group-title">
              <AppIcon name="bell" :size="16" />
              消息中心提醒设置
            </h4>
            <div class="reminder-config">
              <div class="cfg-block">
                <div class="cfg-block-head">
                  <h5 class="cfg-block-title">提前提醒天数</h5>
                </div>
                <div class="cfg-item reminder-days-row">
                  <span class="reminder-days-label">任务结束时间距离今日</span>
                  <input type="number" class="input cfg-val" :value="settingsStore.planReminder.remindDaysAhead" min="1" max="60" @input="e => setRemindDays(parseInt(e.target.value) || 8)" />
                  <span class="reminder-days-label">天内，消息中心开始提醒</span>
                </div>
              </div>

              <div class="cfg-block">
                <div class="cfg-block-head">
                  <h5 class="cfg-block-title">提醒颜色（4 档）</h5>
                  <button class="soft-btn btn-sm" @click="resetPlanReminderColors">恢复默认</button>
                </div>
                <div class="cfg-list">
                  <div class="cfg-item">
                    <input type="color" class="cfg-color" :value="settingsStore.planReminder.remindColors.near" @input="e => updateRemindColor('near', e.target.value)" title="颜色" />
                    <span class="cfg-col-label">临近提醒（≤{{ planRemindDaysAhead }} 天）</span>
                  </div>
                  <div class="cfg-item">
                    <input type="color" class="cfg-color" :value="settingsStore.planReminder.remindColors.urgent" @input="e => updateRemindColor('urgent', e.target.value)" title="颜色" />
                    <span class="cfg-col-label">紧急提醒（≤{{ planUrgentDays }} 天）</span>
                  </div>
                  <div class="cfg-item">
                    <input type="color" class="cfg-color" :value="settingsStore.planReminder.remindColors.overdue" @input="e => updateRemindColor('overdue', e.target.value)" title="颜色" />
                    <span class="cfg-col-label">逾期提醒（逾期 ≥3 天）</span>
                  </div>
                  <div class="cfg-item">
                    <input type="color" class="cfg-color" :value="settingsStore.planReminder.remindColors.severe" @input="e => updateRemindColor('severe', e.target.value)" title="颜色" />
                    <span class="cfg-col-label">严重逾期提醒（逾期 ≥7 天）</span>
                  </div>
                </div>
              </div>

              <div class="cfg-block">
                <div class="cfg-block-head">
                  <h5 class="cfg-block-title">提醒状态</h5>
                  <p class="text-xs text-tertiary" style="margin:0;">勾选需要消息中心提醒的计划状态。状态变为「已完成」后即停止提醒。</p>
                </div>
                <div class="cfg-list">
                  <div v-for="s in settingsStore.planStatuses" :key="s.id" class="cfg-item">
                    <input type="checkbox" :checked="remindStatusChecked(s.id)" @change="toggleRemindStatus(s.id)" />
                    <span class="cfg-col-label">{{ s.name }}</span>
                  </div>
                  <div v-if="settingsStore.planStatuses.length === 0" class="cfg-empty">暂无状态，请先在「计划状态」中添加</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 计划列表表格列显示 -->
          <div class="cfg-group">
            <h4 class="cfg-group-title">
              <AppIcon name="table" :size="16" />
              计划列表表格列显示
            </h4>
            <div class="cfg-list">
              <div v-for="(col, i) in planColumnList" :key="col.key" class="cfg-item">
                <input type="checkbox" :checked="planColumnVisible(col.key)" @change="togglePlanColumn(col.key)" />
                <span class="cfg-col-label">{{ col.label }}</span>
                <button class="soft-btn-icon" @click="movePlanColumn(i, -1)" :disabled="i === 0" title="上移">↑</button>
                <button class="soft-btn-icon" @click="movePlanColumn(i, 1)" :disabled="i === planColumnList.length - 1" title="下移">↓</button>
              </div>
              <button class="soft-btn btn-sm" style="margin-top:6px;" @click="resetPlanColumns">恢复默认列</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 添加底线任务弹窗 ==================== -->
    <div v-if="showDailyTaskModal" class="modal-overlay" style="z-index: 2050;" @click.self="(e) => window.__mwDblClose(e, () => { closeTaskModal() })">
      <div class="modal-content" style="max-width: 520px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">{{ editingTaskId ? '编辑底线任务' : '添加底线任务' }}</h3>
            <div class="modal-head-actions">
              <input v-if="!editingTaskId" type="date" class="modal-head-pick" v-model="taskSelectedDate" :max="todayStrVal" title="选择日期（补录往日/提前安排）" />
              <button class="soft-btn soft-btn-primary" @click="saveTask">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ editingTaskId ? '保存' : '添加' }}
              </button>
              <button class="soft-btn-close" @click="closeTaskModal" title="关闭">×</button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
            <div class="form-group">
              <label class="form-label">任务主题 <span v-if="!dailyTaskForm.planId" style="color:var(--color-danger);">*</span></label>
              <input class="input" v-model="dailyTaskForm.title" placeholder="输入任务主题" />
              <p v-if="dailyTaskForm.planId" class="text-xs" style="color: var(--color-text-tertiary); margin-top: 4px;">留空则默认使用计划名称《{{ linkedPlanOf(dailyTaskForm.planId)?.title || '' }}》。</p>
            </div>
            <div class="form-group">
              <label class="form-label">任务描述</label>
              <textarea class="input" v-model="dailyTaskForm.description" placeholder="补充说明（可选）" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">关联计划（可选）</label>
              <GlassSelect
                v-model="dailyTaskForm.planId"
                select-class="input"
                :options="[
                  { value: '', label: '不关联计划（临时任务）' },
                  ...linkablePlans.map(p => ({ value: p.id, label: p.title }))
                ]"
                placeholder="不关联计划（临时任务）"
              />
              <p v-if="dailyTaskForm.planId" class="text-xs" style="color: var(--color-text-tertiary); margin-top: 4px;">关联后任务行主题后将显示计划名称标签。</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 底线任务详情弹窗 ==================== -->
    <div v-if="taskDetail" class="modal-overlay" style="z-index: 2050;" @click.self="taskDetail = null">
      <div class="modal-content" style="max-width: 520px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">底线任务详情</h3>
            <div class="modal-head-actions">
              <button class="soft-btn" @click="editFromDetail">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                编辑
              </button>
              <span class="status-tag dt-status-toggle" :style="getTaskStateTagStyle(taskDetail)" @click.stop="toggleTaskStateMenu(taskDetail, $event)">
                {{ getTaskStateName(taskDetail) }}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
              <button class="soft-btn-close" @click="taskDetail = null" title="关闭">×</button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="status-tag" :style="getTaskStateTagStyle(taskDetail)">{{ getTaskStateName(taskDetail) }}</span>
              <span v-if="taskDetail.planId" class="dt-tag" style="background: rgba(139,92,246,0.12); color: #8B5CF6;">关联计划</span>
              <span v-else class="dt-tag" style="background: var(--color-bg); color: var(--color-text-tertiary);">临时任务</span>
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">任务名称</label>
              <div style="font-size: 15px; font-weight: 600;">{{ taskDetail.title }}</div>
            </div>
            <div v-if="taskDetail.description" class="form-group" style="margin: 0;">
              <label class="form-label">任务描述</label>
              <div style="font-size: 13px; color: var(--color-text-secondary); white-space: pre-wrap;">{{ taskDetail.description }}</div>
            </div>
            <div v-if="taskDetail.completed && taskDetail.completedAt" class="form-group" style="margin: 0;">
              <label class="form-label">完成时间</label>
              <div style="font-size: 13px; color: var(--color-text-secondary);">{{ taskDetail.completedAt }}</div>
            </div>
            <template v-if="taskDetail.planId && linkedPlanOf(taskDetail.planId)">
              <div class="form-group" style="margin: 0; padding-top: 12px; border-top: 1px solid var(--color-border);">
                <label class="form-label">关联计划信息</label>
                <div style="background: rgba(139,92,246,0.06); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="font-size: 14px; font-weight: 600;">《{{ linkedPlanOf(taskDetail.planId).title }}》</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--color-text-tertiary);">
                    <span>层级：{{ planLevelName(linkedPlanOf(taskDetail.planId).level) }}</span>
                    <span>状态：{{ planStatusName(linkedPlanOf(taskDetail.planId).status) }}</span>
                    <span>进度：{{ linkedPlanOf(taskDetail.planId).progress || 0 }}%</span>
                    <span v-if="linkedPlanOf(taskDetail.planId).endDate">截止：{{ linkedPlanOf(taskDetail.planId).endDate }}</span>
                  </div>
                </div>
              </div>
            </template>
            <p v-else-if="taskDetail.planId" class="text-xs" style="color: var(--color-warning); margin: 0;">关联的计划已删除或变更，仅保留打卡记录。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 今日总结添加弹窗 ==================== -->
    <div v-if="showDailySummaryModal" class="modal-overlay" style="z-index: 2050;" @click.self="closeDailySummaryModal">
      <div class="modal-content" style="max-width: 520px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">今日总结</h3>
            <div class="modal-head-actions">
              <input type="date" class="modal-head-pick" v-model="summarySelectedDate" :max="todayStrVal" title="选择日期（补录往日总结）" />
              <button class="soft-btn soft-btn-primary" @click="saveDailySummaryFromModal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                保存
              </button>
              <button class="soft-btn-close" @click="closeDailySummaryModal" title="关闭">×</button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
            <div class="form-group">
              <label class="form-label">今日工作进展</label>
              <textarea class="input" v-model="dailySummaryForm.progress" rows="3" placeholder="记录今天完成了什么、进展如何..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">遇到的问题</label>
              <textarea class="input" v-model="dailySummaryForm.problems" rows="2" placeholder="遇到的困难或卡点..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">明日计划</label>
              <textarea class="input" v-model="dailySummaryForm.tomorrow" rows="2" placeholder="明天打算做什么..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 本周总结添加弹窗 ==================== -->
    <div v-if="showWeeklySummaryModal" class="modal-overlay" style="z-index: 2050;" @click.self="closeWeeklySummaryModal">
      <div class="modal-content" style="max-width: 520px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">本周总结</h3>
            <div class="modal-head-actions">
              <input type="date" class="modal-head-pick" v-model="weeklySelectedWeekStart" title="选择本周任意一天，将归入其所在周（周一~周日）" />
              <button class="soft-btn soft-btn-primary" @click="saveWeeklySummaryFromModal">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                保存
              </button>
              <button class="soft-btn-close" @click="closeWeeklySummaryModal" title="关闭">×</button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 16px;">
            <div class="form-group">
              <label class="form-label">本周工作进展</label>
              <textarea class="input" v-model="weeklySummaryForm.progress" rows="3" placeholder="总结本周整体进展..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">下周计划</label>
              <textarea class="input" v-model="weeklySummaryForm.nextWeek" rows="2" placeholder="下周重点方向..."></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态选择浮层：点击底线任务状态标签后弹出（fixed 定位，z-index 高于详情弹窗） -->
    <div v-if="stateMenuTask" class="dt-state-menu" :style="stateMenuStyle" @click.stop>
      <div v-for="opt in stateMenuOptions" :key="opt.value"
        class="dt-state-menu-item"
        :class="{ 'dt-state-menu-active': opt.value === taskState(stateMenuTask) }"
        :style="opt.style"
        @click.stop="pickTaskState(opt.value)">
        {{ opt.label }}
      </div>
    </div>

    <!-- ==================== 每日打卡设置弹窗 ==================== -->
    <div v-if="showDailyCheckinSettings" class="modal-overlay plan-config-overlay" style="z-index: 2100;" @click.self="showDailyCheckinSettings = false">
      <div class="modal-content config-modal" style="max-width: 480px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title"><AppIcon name="settings" />  每日打卡设置</h3>
            <button class="soft-btn-close" @click="showDailyCheckinSettings = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <p class="text-xs text-tertiary" style="margin-bottom: 16px;">自定义今日底线任务的打卡状态、显示颜色及下拉菜单排序。修改即时生效。</p>
          <div class="cfg-group">
            <h4 class="cfg-group-title">
              <AppIcon name="check-circle" :size="16" />
              打卡状态
            </h4>
            <div class="cfg-list">
              <div v-for="(item, i) in settingsStore.taskStates" :key="item.id" class="cfg-item">
                <input type="color" class="cfg-color" :value="item.color" @input="e => updateTaskStateItem(i, { color: e.target.value })" title="颜色" />
                <input class="input cfg-name" :value="item.name" @input="e => updateTaskStateItem(i, { name: e.target.value })" placeholder="状态名称" />
                <button class="soft-btn-icon" @click="moveTaskStateItem(i, -1)" :disabled="i === 0" title="上移">↑</button>
                <button class="soft-btn-icon" @click="moveTaskStateItem(i, 1)" :disabled="i === settingsStore.taskStates.length - 1" title="下移">↓</button>
                <button class="soft-btn-icon danger" @click="deleteTaskStateItem(i)" title="删除">✕</button>
              </div>
              <div v-if="settingsStore.taskStates.length === 0" class="cfg-empty">暂无，点击「+ 添加状态」</div>
            </div>
            <div style="margin-top: 10px; display: flex; gap: 8px;">
              <button class="soft-btn btn-sm" @click="addTaskStateItem">+ 添加状态</button>
              <button class="soft-btn btn-sm" @click="resetTaskStatesAll">恢复默认</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 查看所有今日总结弹窗 ==================== -->
    <div v-if="showAllSummariesModal" class="modal-overlay" style="z-index: 2050;" @click.self="showAllSummariesModal = false">
      <div class="modal-content" style="max-width: 620px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">所有今日总结</h3>
            <button class="soft-btn-close" @click="showAllSummariesModal = false" title="关闭">×</button>
          </div>
          <p class="text-xs text-tertiary" style="margin-bottom: 16px;">共 {{ allDailySummaries.length }} 条记录，按日期降序排列</p>
          <div v-if="allDailySummaries.length === 0" class="empty-state" style="padding: 32px 0;">
            <p>暂无总结记录</p>
          </div>
          <div v-else class="all-summary-list">
            <div v-for="s in allDailySummaries" :key="s.id" class="all-summary-item">
              <div class="as-head">
                <span class="as-date">{{ s.date }}</span>
                <span v-if="s.writtenAt" class="as-time">{{ s.writtenAt }}</span>
              </div>
              <div class="as-section">
                <span class="as-label">今日进展</span>
                <span class="as-text">{{ s.progress || '—' }}</span>
              </div>
              <div v-if="s.problems" class="as-section">
                <span class="as-label">遇到的问题</span>
                <span class="as-text">{{ s.problems }}</span>
              </div>
              <div v-if="s.tomorrow" class="as-section">
                <span class="as-label">明日计划</span>
                <span class="as-text">{{ s.tomorrow }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { usePlanStore, useSettingsStore } from '../stores'
import PlanCalendar from '../components/plan/PlanCalendar.vue'
import GlassSelect from '../components/common/GlassSelect.vue'
import { todayStr, nowStr, uid } from '../utils/storage'
import { printHtml } from '../utils/desktopBridge'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const planStore = usePlanStore()
const settingsStore = useSettingsStore()

// ===== Tab 状态 =====
const activeTab = ref(settingsStore.activeSubTabs['/plan'] || 'overview')
watch(activeTab, (v) => settingsStore.setActiveSubTab('/plan', v))
watch(() => settingsStore.activeSubTabs['/plan'], (v) => { if (v && v !== activeTab.value) activeTab.value = v })
const tabs = [
  { id: 'overview', name: '总览' },
  { id: 'daily', name: '每日打卡' },
    { id: 'library', name: '计划列表' },
  { id: 'calendar', name: '日历视图' },
]

// ===== 自定义配置 =====
const planStatuses = computed(() => settingsStore.planStatuses || [])
const planCategories = computed(() => settingsStore.planCategories || [])
const planLevels = computed(() => settingsStore.planLevels || [])
const planPriorities = computed(() => settingsStore.planPriorities || [])

const sortedPlanStatuses = computed(() => [...planStatuses.value].sort((a, b) => a.order - b.order))
const sortedPlanCategories = computed(() => [...planCategories.value].sort((a, b) => a.order - b.order))
const sortedPlanLevels = computed(() => [...planLevels.value].sort((a, b) => a.order - b.order))
const sortedPlanPriorities = computed(() => [...planPriorities.value].sort((a, b) => a.order - b.order))

// 子任务填充色配置（平台设置自定义）
const subtaskColors = computed(() => settingsStore.subtaskColors || [])

function getStatusItem(statusId) {
  return sortedPlanStatuses.value.find(s => s.id === statusId) || { name: statusId, color: '#6B7280' }
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

function getLevelItem(levelId) {
  return planLevels.value.find(l => l.id === levelId) || { name: levelId, color: '#6B7280' }
}
function getLevelName(levelId) {
  return getLevelItem(levelId).name
}
function getLevelStyle(levelId) {
  const l = getLevelItem(levelId)
  return { background: l.color + '20', color: l.color }
}

function getPriorityItem(priorityValue) {
  const v = Number(priorityValue)
  return planPriorities.value.find(p => p.value === v) || { name: v === 3 ? '高' : v === 2 ? '中' : '低', color: '#6B7280' }
}
function getPriorityName(priorityValue) {
  return getPriorityItem(priorityValue).name
}
function getPriorityStyle(priorityValue) {
  const p = getPriorityItem(priorityValue)
  return { background: p.color + '20', color: p.color }
}

// ===== 表格内快速编辑弹窗 =====
const picker = ref({ planId: null, type: null, style: {} })

function openCellPicker(plan, type, event) {
  if (picker.value.planId === plan.id && picker.value.type === type) {
    picker.value = { planId: null, type: null, style: {} }
    return
  }
  const badge = event?.target?.closest?.('.status-tag, .category-tag, .level-tag, .priority-tag') || event?.target
  if (badge) {
    const rect = badge.getBoundingClientRect()
    picker.value = {
      planId: plan.id,
      type,
      style: {
        position: 'fixed',
        top: (rect.bottom + 4) + 'px',
        left: (rect.left + rect.width / 2) + 'px',
        transform: 'translateX(-50%)',
      }
    }
  }
}

function updatePlanField(plan, field, value) {
  const updates = { [field]: value }
  if (field === 'status' && value === 'completed') updates.progress = 100
  if (field === 'status' && value !== 'completed' && plan.progress === 100) updates.progress = 0
  planStore.updatePlan(plan.id, updates)
  picker.value = { planId: null, type: null, style: {} }
}

function closePickerOnClick(e) {
  if (!e.target.closest('.cell-picker-wrap')) {
    picker.value = { planId: null, type: null, style: {} }
  }
  if (!e.target.closest('.subtask-cell') && !e.target.closest('.subtask-picker')) {
    subtaskPicker.value = { planId: null, index: null, style: {} }
  }
  if (showExportMenu.value && !e.target.closest('.export-dropdown')) {
    showExportMenu.value = false
  }
  if (stateMenuTask.value && !e.target.closest('.dt-state-menu') && !e.target.closest('.dt-status-toggle')) {
    stateMenuTask.value = null
  }
}

// ===== 子任务颜色填充 =====
const subtaskPicker = ref({ planId: null, index: null, style: {} })
const subtaskCustom = ref('#22D3EE')
const subtaskDateInput = ref('')  // 截止时间输入框值，打开时自动清空便于更新

function subAt(plan, i) {
  const s = plan.subtasks && plan.subtasks[i]
  if (!s) return { text: '', color: '', date: '' }
  if (typeof s === 'string') return { text: s, color: '', date: '' }
  return { text: s.text || '', color: s.color || '', date: s.date || '' }
}

function toDatetimeLocal(dateStr) {
  if (!dateStr) return ''
  const s = String(dateStr).trim().replace(' ', 'T')
  if (s.length === 19) return s // YYYY-MM-DD HH:mm:ss -> YYYY-MM-DDTHH:mm:ss
  if (s.length === 16) return s + ':00' // YYYY-MM-DD HH:mm
  return s
}

function fromDatetimeLocal(localStr) {
  if (!localStr) return ''
  return String(localStr).replace('T', ' ')
}

function formatSubtaskDate(dateStr) {
  if (!dateStr) return ''
  const d = dayjs(String(dateStr).trim())
  return d.isValid() ? d.format('MM-DD HH:mm') : String(dateStr)
}

function getContrastColor(hex) {
  const c = (hex || '').replace('#', '')
  if (c.length !== 6) return '#1f2937'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1f2937' : '#ffffff'
}

function subtaskCellStyle(plan, i) {
  const color = subAt(plan, i).color
  if (!color) return {}
  return { background: color, color: getContrastColor(color) }
}

function openSubtaskPicker(plan, index, event) {
  if (subtaskPicker.value.planId === plan.id && subtaskPicker.value.index === index) {
    subtaskPicker.value = { planId: null, index: null, style: {} }
    return
  }
  const cell = event?.target?.closest?.('.subtask-cell') || event?.target
  if (cell) {
    const rect = cell.getBoundingClientRect()
    const pickerHeight = 320 // 颜色项 × 8 + padding + divider 预留
    const gap = 6
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow >= pickerHeight + gap ? rect.bottom + gap : Math.max(8, rect.top - pickerHeight - gap)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 230))
    subtaskPicker.value = {
      planId: plan.id,
      index,
      style: {
        position: 'fixed',
        top: top + 'px',
        left: left + 'px',
        zIndex: 99999,
      }
    }
    // 打开时清空时间输入框，便于更新状态
    subtaskDateInput.value = ''
  }
}

function selectSubtaskColor(plan, index, color) {
  const subs = (plan.subtasks || []).map(s => typeof s === 'string' ? { text: s, color: '', date: '' } : { ...s })
  while (subs.length < 6) subs.push({ text: '', color: '', date: '' })
  subs[index] = { ...subs[index], color }
  planStore.updatePlan(plan.id, { subtasks: subs })
  subtaskPicker.value = { planId: null, index: null, style: {} }
}

function updateSubtaskDate(plan, index, localValue) {
  const subs = (plan.subtasks || []).map(s => typeof s === 'string' ? { text: s, color: '', date: '' } : { ...s })
  while (subs.length < 6) subs.push({ text: '', color: '', date: '' })
  subs[index] = { ...subs[index], date: fromDatetimeLocal(localValue) }
  planStore.updatePlan(plan.id, { subtasks: subs })
}

onMounted(() => {
  if (activeTab.value === 'overview') nextTick(() => initChart())
  window.addEventListener('click', closePickerOnClick)
})

onBeforeUnmount(() => {
  if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  window.removeEventListener('click', closePickerOnClick)
})
const chartRef = ref(null)
let chartInstance = null

const statusItems = computed(() => {
  const plans = planStore.plans
  return sortedPlanStatuses.value.map(s => ({
    id: s.id,
    name: s.name,
    count: plans.filter(p => p.status === s.id).length,
    color: s.color,
  })).filter(s => s.count > 0)
})

const completedCount = computed(() => planStore.plans.filter(p => p.status === 'completed').length)
const incompleteCount = computed(() => planStore.plans.filter(p => p.status !== 'completed').length)
const overdueCount = computed(() => planStore.plans.filter(p => p.status === 'overdue').length)
const todayDueCount = computed(() => {
  const today = todayStr()
  return planStore.plans.filter(p => {
    const d = p.endDate ? String(p.endDate).slice(0, 10) : ''
    return d === today && p.status !== 'completed'
  }).length
})
const weeklyNewCount = computed(() => {
  const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
  return planStore.plans.filter(p => {
    const t = p.acceptTime || p.createdAt || ''
    return String(t).slice(0, 10) >= weekAgo
  }).length
})

// ===== 每日打卡 =====
const todayStrVal = computed(() => todayStr())
const weekStart = computed(() => dayjs(todayStrVal.value).startOf('week').add(1, 'day').format('YYYY-MM-DD'))
const weekEnd = computed(() => dayjs(weekStart.value).add(6, 'day').format('YYYY-MM-DD'))

// ===== 历史查看（日/周切换）=====
const dailyViewDate = ref(todayStr())
const dailyViewIsToday = computed(() => dailyViewDate.value === todayStrVal.value)
const dailyViewDateLabel = computed(() => dayjs(dailyViewDate.value).format('YYYY-MM-DD dddd').replace('星期', '周'))
function shiftDailyView(delta) {
  dailyViewDate.value = dayjs(dailyViewDate.value).add(delta, 'day').format('YYYY-MM-DD')
}
function resetDailyView() {
  dailyViewDate.value = todayStrVal.value
}

const viewWeekStart = ref(dayjs(todayStr()).startOf('week').add(1, 'day').format('YYYY-MM-DD'))
const viewWeekEnd = computed(() => dayjs(viewWeekStart.value).add(6, 'day').format('YYYY-MM-DD'))
const isCurrentWeek = computed(() => viewWeekStart.value === weekStart.value)
function shiftWeeklyView(delta) {
  viewWeekStart.value = dayjs(viewWeekStart.value).add(delta, 'week').format('YYYY-MM-DD')
}
function resetWeeklyView() {
  viewWeekStart.value = weekStart.value
}

const currentCheckin = computed(() => planStore.getCheckin(dailyViewDate.value))
const todayTasks = computed(() => currentCheckin.value?.tasks || [])
const dailyTotalCount = computed(() => todayTasks.value.length)
const dailyCompletedCount = computed(() => todayTasks.value.filter(t => t.completed).length)
const dailyAbandonedCount = computed(() => todayTasks.value.filter(t => getTaskState(t) === 'abandoned').length)
const dailyProgressPercent = computed(() => dailyTotalCount.value ? Math.round((dailyCompletedCount.value / dailyTotalCount.value) * 100) : 0)
const dailyGoalMet = computed(() => {
  const activeTotal = todayTasks.value.filter(t => getTaskState(t) !== 'abandoned').length
  return activeTotal > 0 && dailyCompletedCount.value === activeTotal
})
const dailyGoalMetText = computed(() => {
  if (dailyTotalCount.value > 0 && todayTasks.value.every(t => getTaskState(t) === 'abandoned')) {
    const abItem = sortedTaskStates.value.find(x => x.id === 'abandoned')
    return abItem ? abItem.name : '全部放弃'
  }
  if (dailyGoalMet.value) {
    const cItem = sortedTaskStates.value.find(x => x.id === 'completed')
    return cItem ? (cItem.name + '·底线达成') : '底线达成'
  }
  const pItem = sortedTaskStates.value.find(x => x.id === 'pending')
  return pItem ? pItem.name : '待完成'
})
const dailyGoalMetStyle = computed(() => {
  if (dailyTotalCount.value > 0 && todayTasks.value.every(t => getTaskState(t) === 'abandoned')) {
    const item = sortedTaskStates.value.find(x => x.id === 'abandoned')
    return item ? { background: item.color + '15', color: item.color } : { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }
  }
  if (dailyGoalMet.value) {
    const item = sortedTaskStates.value.find(x => x.id === 'completed')
    return item ? { background: item.color + '15', color: item.color } : { background: 'rgba(16,185,129,0.12)', color: '#10B981' }
  }
  const item = sortedTaskStates.value.find(x => x.id === 'pending')
  return item ? { background: item.color + '15', color: item.color } : { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }
})

function getTaskState(task) {
  // 如果 task.state 存在且不在默认三态中，尝试从 settingsStore 查找
  if (task && task.state && task.state !== 'pending' && task.state !== 'completed' && task.state !== 'abandoned') {
    // 自定义状态：直接返回 state ID
    return task.state
  }
  if (task && task.state === 'abandoned') return 'abandoned'
  return task && task.completed ? 'completed' : 'pending'
}
const taskState = getTaskState

// 从 settingsStore.taskStates 动态获取状态配置
const sortedTaskStates = computed(() => [...settingsStore.taskStates].sort((a, b) => a.order - b.order))

function getTaskStateName(task) {
  const s = getTaskState(task)
  const item = sortedTaskStates.value.find(x => x.id === s)
  return item ? item.name : s
}
function getTaskStateTagStyle(task) {
  const s = getTaskState(task)
  const item = sortedTaskStates.value.find(x => x.id === s)
  if (item) return { background: item.color + '20', color: item.color }
  return { background: 'rgba(107,114,128,0.12)', color: '#6B7280' }
}

// 状态选择浮层（点击状态标签弹出）—— 选项从 taskStates 动态生成，顺序由 order 决定
const stateMenuTask = ref(null)
const stateMenuPos = ref({})
const stateMenuOptions = computed(() => sortedTaskStates.value.map(s => ({
  value: s.id,
  label: s.name,
  style: { background: s.color + '15', color: s.color },
})))
function toggleTaskStateMenu(task, e) {
  if (stateMenuTask.value && stateMenuTask.value.id === task.id) {
    stateMenuTask.value = null
    return
  }
  stateMenuTask.value = task
  nextTick(() => {
    const el = e && e.currentTarget ? e.currentTarget : document.querySelector('.dt-status-toggle')
    if (!el) return
    const rect = el.getBoundingClientRect()
    const menuEl = document.querySelector('.dt-state-menu')
    const menuW = menuEl ? menuEl.offsetWidth : 132
    const menuH = menuEl ? menuEl.offsetHeight : 96
    let left = rect.left
    let top = rect.bottom + 4
    if (left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8
    if (top + menuH > window.innerHeight - 8) top = rect.top - menuH - 4
    stateMenuPos.value = { left: left + 'px', top: top + 'px' }
  })
}
function pickTaskState(state) {
  const t = stateMenuTask.value
  if (!t) return
  planStore.setCheckinTaskState(dailyViewDate.value, t.id, state)
  stateMenuTask.value = null
}
const stateMenuStyle = computed(() => stateMenuPos.value)

const linkablePlans = computed(() => planStore.plans.filter(p => p.status !== 'completed'))

// 添加 / 编辑底线任务弹窗
const showDailyTaskModal = ref(false)
const editingTaskId = ref(null)
const dailyTaskForm = ref({ title: '', description: '', planId: '' })
// 弹窗内选择日期（补录往日 / 提前安排），仅添加模式可用
const taskSelectedDate = ref(todayStrVal.value)

function openTaskModal() {
  editingTaskId.value = null
  dailyTaskForm.value = { title: '', description: '', planId: '' }
  taskSelectedDate.value = todayStrVal.value
  showDailyTaskModal.value = true
}
function openEditTaskModal(task) {
  editingTaskId.value = task.id
  dailyTaskForm.value = {
    title: task.title || '',
    description: task.description || '',
    planId: task.planId || '',
  }
  showDailyTaskModal.value = true
}
function closeTaskModal() {
  showDailyTaskModal.value = false
  editingTaskId.value = null
}

// 今日总结弹窗（每次打开重置为空，避免残留上次填写内容）
const showDailySummaryModal = ref(false)
function openDailySummaryModal() {
  dailySummaryForm.value = { progress: '', problems: '', tomorrow: '' }
  summarySelectedDate.value = todayStrVal.value
  showDailySummaryModal.value = true
}
function closeDailySummaryModal() {
  showDailySummaryModal.value = false
}
// 编辑已有总结：按当前查看日期预填内容，打开同一弹窗（保存时直接覆盖写入）
function openDailySummaryEdit() {
  const s = planStore.getDailySummary(dailyViewDate.value)
  dailySummaryForm.value = {
    progress: s?.progress || '',
    problems: s?.problems || '',
    tomorrow: s?.tomorrow || '',
  }
  summarySelectedDate.value = dailyViewDate.value
  showDailySummaryModal.value = true
}
// 弹窗内选择日期（补录往日总结）
const summarySelectedDate = ref(todayStrVal.value)
function saveDailySummaryFromModal() {
  const date = summarySelectedDate.value
  planStore.setDailySummary(date, dailySummaryForm.value)
  // 自动将「明日计划」逐行生成为次日（相对所选日期）的底线任务，避免重复
  const tomorrow = dayjs(date).add(1, 'day').format('YYYY-MM-DD')
  const lines = (dailySummaryForm.value.tomorrow || '')
    .split('\n').map(s => s.trim()).filter(Boolean)
  const checkin = planStore.getCheckin(tomorrow)
  if (checkin) {
    checkin.tasks
      .filter(t => t.source === 'tomorrowPlan' && t.sourceDate === date)
      .forEach(t => planStore.deleteCheckinTask(tomorrow, t.id))
  }
  lines.forEach(line => {
    planStore.addCheckinTask(tomorrow, { title: line, source: 'tomorrowPlan', sourceDate: date })
  })
  closeDailySummaryModal()
}

// 本周总结弹窗（每次打开重置为空，避免残留上次填写内容）
const showWeeklySummaryModal = ref(false)
// 弹窗内选择周（取所选日期所在周的周一~周日）
const weeklySelectedWeekStart = ref(weekStart.value)
function openWeeklySummaryModal() {
  weeklySummaryForm.value = { progress: '', nextWeek: '' }
  weeklySelectedWeekStart.value = weekStart.value
  showWeeklySummaryModal.value = true
}
function closeWeeklySummaryModal() {
  showWeeklySummaryModal.value = false
}
function saveWeeklySummaryFromModal() {
  const ws = dayjs(weeklySelectedWeekStart.value).startOf('week').add(1, 'day').format('YYYY-MM-DD')
  planStore.setWeeklySummary(ws, {
    weekEnd: dayjs(ws).add(6, 'day').format('YYYY-MM-DD'),
    progress: weeklySummaryForm.value.progress,
    nextWeek: weeklySummaryForm.value.nextWeek,
  })
  closeWeeklySummaryModal()
}
// 关联计划的查找
function linkedPlanOf(planId) {
  return planStore.plans.find(x => x.id === planId) || null
}
function planLevelName(levelId) {
  const l = (settingsStore.planLevels || []).find(x => x.id === levelId)
  return l ? l.name : levelId
}
function planStatusName(statusId) {
  const s = (settingsStore.planStatuses || []).find(x => x.id === statusId)
  return s ? s.name : statusId
}
// 底线任务详情弹窗
const taskDetail = ref(null)
function openTaskDetail(task) { taskDetail.value = task }
function editFromDetail() {
  const t = taskDetail.value
  taskDetail.value = null
  if (t) openEditTaskModal(t)
}
function saveTask() {
  let title = dailyTaskForm.value.title.trim()
  const description = dailyTaskForm.value.description.trim()
  const planId = dailyTaskForm.value.planId || ''
  // 关联计划且未填主题时，默认使用计划名称
  if (planId && !title) {
    const p = linkedPlanOf(planId)
    if (!p) return
    title = p.title
  }
  if (!title) return
  if (editingTaskId.value) {
    planStore.updateCheckinTask(dailyViewDate.value, editingTaskId.value, { title, description, planId })
  } else {
    planStore.addCheckinTask(taskSelectedDate.value, { title, description, planId })
  }
  closeTaskModal()
}
function toggleTask(task) { planStore.toggleCheckinTask(dailyViewDate.value, task.id) }
function deleteTask(task) {
  if (confirm(`确定删除底线任务「${task.title}」吗？`)) {
    planStore.deleteCheckinTask(dailyViewDate.value, task.id)
  }
}

const dailySummaryForm = ref({ progress: '', problems: '', tomorrow: '' })
const currentDailySummary = computed(() => planStore.getDailySummary(dailyViewDate.value))
const dailySummaryFilled = computed(() => !!currentDailySummary.value?.writtenAt)

const weeklySummaryForm = ref({ progress: '', nextWeek: '' })
const currentWeeklySummary = computed(() => planStore.getWeeklySummary(viewWeekStart.value))
const weeklySummaryFilled = computed(() => !!currentWeeklySummary.value?.writtenAt)

const currentWeekRange = computed(() => `${dayjs(viewWeekStart.value).format('M.D')} - ${dayjs(viewWeekEnd.value).format('M.D')}`)

function getCheckinForDate(date) {
  return planStore.dailyCheckins.find(c => c.date === date)
}

function getDayRatio(date) {
  const c = getCheckinForDate(date)
  if (!c || c.tasks.length === 0) return null
  const active = c.tasks.filter(t => getTaskState(t) !== 'abandoned')
  const done = active.filter(t => t.completed).length
  const total = active.length
  if (total === 0) return { done: 0, total: c.tasks.length, rate: 0, allAbandoned: true }
  return { done, total, rate: done / total }
}

const weekDates = computed(() => {
  const today = todayStrVal.value
  const start = viewWeekStart.value
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return days.map((name, i) => {
    const date = dayjs(start).add(i, 'day').format('YYYY-MM-DD')
    const ratio = getDayRatio(date)
    const isFuture = date > today
    let ratioText = '—'
    let color = 'var(--color-text-tertiary)'
    if (ratio) {
      ratioText = `${ratio.done}/${ratio.total}`
      color = ratio.rate === 1 ? '#10B981' : (isFuture ? '#185FA5' : '#F59E0B')
    } else if (date === today) {
      ratioText = '0/0'
      color = '#185FA5'
    } else if (!isFuture) {
      ratioText = '0/0'
      color = '#9CA3AF'
    }
    return { date, shortName: name, ratioText, color, isFuture }
  })
})

const weekCompleted = computed(() => {
  let n = 0
  for (let i = 0; i < 7; i++) {
    const date = dayjs(viewWeekStart.value).add(i, 'day').format('YYYY-MM-DD')
    const c = getCheckinForDate(date)
    if (c) n += (c.tasks || []).filter(t => getTaskState(t) !== 'abandoned' && t.completed).length
  }
  return n
})
const weekTotal = computed(() => {
  let n = 0
  for (let i = 0; i < 7; i++) {
    const date = dayjs(viewWeekStart.value).add(i, 'day').format('YYYY-MM-DD')
    const c = getCheckinForDate(date)
    if (c) n += (c.tasks || []).filter(t => getTaskState(t) !== 'abandoned').length
  }
  return n
})

const weeklyRate = computed(() => {
  let metDays = 0
  let hasTaskDays = 0
  for (let i = 0; i < 7; i++) {
    const date = dayjs(viewWeekStart.value).add(i, 'day').format('YYYY-MM-DD')
    const c = getCheckinForDate(date)
    const active = (c?.tasks || []).filter(t => getTaskState(t) !== 'abandoned')
    if (active.length > 0) {
      hasTaskDays++
      if (active.every(t => t.completed)) metDays++
    }
  }
  return hasTaskDays ? Math.round((metDays / hasTaskDays) * 100) : 0
})

const currentStreak = computed(() => {
  let streak = 0
  let d = dayjs(todayStrVal.value)
  while (true) {
    const date = d.format('YYYY-MM-DD')
    const c = planStore.dailyCheckins.find(x => x.date === date)
    const active = (c?.tasks || []).filter(t => getTaskState(t) !== 'abandoned')
    const met = active.length > 0 && active.every(t => t.completed)
    if (!met) break
    streak++
    d = d.subtract(1, 'day')
  }
  return streak
})

function formatDate(dateStr) {
  return dayjs(dateStr).format('MM-DD dddd').replace('星期', '周')
}

// ===== 统计明细弹窗 =====
const showStatDetail = ref(false)
const statDetailType = ref('')
const statDetailMeta = {
  total: '全部计划',
  completed: '已完成计划',
  incomplete: '未完成计划',
  overdue: '已逾期计划',
  todayDue: '今日需完成计划',
  weeklyNew: '本周新增计划',
}
const statDetailTitle = computed(() => statDetailMeta[statDetailType.value] || '计划明细')

function plansByType(type) {
  const today = todayStr()
  const weekAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
  switch (type) {
    case 'completed':
      return planStore.plans.filter(p => p.status === 'completed')
    case 'incomplete':
      return planStore.plans.filter(p => p.status !== 'completed')
    case 'overdue':
      return planStore.plans.filter(p => p.status === 'overdue')
    case 'todayDue':
      return planStore.plans.filter(p => {
        const d = p.endDate ? String(p.endDate).slice(0, 10) : ''
        return d === today && p.status !== 'completed'
      })
    case 'weeklyNew':
      return planStore.plans.filter(p => {
        const t = p.acceptTime || p.createdAt || ''
        return String(t).slice(0, 10) >= weekAgo
      })
    default:
      return planStore.plans
  }
}
const statDetailPlans = computed(() => plansByType(statDetailType.value))

function openStatDetail(type) {
  statDetailType.value = type
  showStatDetail.value = true
}

function renderChart() {
  if (!chartInstance) return
  const data = statusItems.value.map(s => ({ name: s.name, value: s.count, itemStyle: { color: s.color } }))
  if (data.length === 0) {
    chartInstance.setOption({
      title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#9CA3AF', fontSize: 14 } },
    }, true)
    return
  }
  chartInstance.setOption({
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

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  chartInstance = echarts.init(chartRef.value)
  renderChart()
}

watch(activeTab, async (val) => {
  if (val === 'overview') { await nextTick(); initChart() }
})

// ===== 总览下方近期任务 =====
const recentPlans = computed(() => {
  const today = todayStr()
  const sorted = [...planStore.plans].sort((a, b) => {
    // 未完成的排在前面，今日截止的排在最前面
    const aToday = (a.endDate || '').slice(0, 10) === today ? 2 : a.status !== 'completed' ? 1 : 0
    const bToday = (b.endDate || '').slice(0, 10) === today ? 2 : b.status !== 'completed' ? 1 : 0
    if (aToday !== bToday) return bToday - aToday
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  })
  return sorted.slice(0, 6)
})

// ===== 筛选与排序 =====
const searchQuery = ref('')
const filterStatus = ref('')
const filterCategory = ref('')
const filterLevel = ref('')
const filterPriority = ref('')
const sortField = ref('')
const sortDirection = ref('desc')

function toggleSortDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

const hasActiveFilters = computed(() => {
  return searchQuery.value || filterStatus.value || filterCategory.value || filterLevel.value || filterPriority.value || sortField.value
})

const filteredPlans = computed(() => {
  let plans = [...planStore.plans]

  // 搜索
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    plans = plans.filter(p =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (getCategoryName(p.category).toLowerCase().includes(q)) ||
      (p.subtasks && p.subtasks.some(s => s && (typeof s === 'string' ? s : (s.text || '')).toLowerCase().includes(q)))
    )
  }

  // 状态筛选
  if (filterStatus.value) plans = plans.filter(p => p.status === filterStatus.value)

  // 分类筛选（兼容旧数据中文名）
  if (filterCategory.value) {
    plans = plans.filter(p => normalizeCategory(p.category) === filterCategory.value)
  }

  // 层级筛选
  if (filterLevel.value) plans = plans.filter(p => p.level === filterLevel.value)

  // 优先级筛选
  if (filterPriority.value) plans = plans.filter(p => String(p.priority) === filterPriority.value)

  // 排序
  if (sortField.value) {
    const dir = sortDirection.value === 'asc' ? 1 : -1
    plans.sort((a, b) => {
      if (sortField.value === 'acceptTime') {
        const ta = String(a.acceptTime || a.createdAt || '')
        const tb = String(b.acceptTime || b.createdAt || '')
        return dir * ta.localeCompare(tb)
      }
      if (sortField.value === 'endDate') {
        const ta = String(a.endDate || '')
        const tb = String(b.endDate || '')
        if (!ta && !tb) return 0
        if (!ta) return dir
        if (!tb) return -dir
        return dir * ta.localeCompare(tb)
      }
      if (sortField.value === 'category') {
        const ca = getCategoryName(a.category)
        const cb = getCategoryName(b.category)
        return dir * ca.localeCompare(cb, 'zh-CN')
      }
      if (sortField.value === 'priority') {
        return dir * ((a.priority || 2) - (b.priority || 2))
      }
      return 0
    })
  } else {
    // 默认排序：按状态分组（进行中→其他→已完成），组内按结束时间升序
    plans.sort((a, b) => {
      // 状态优先级：active=0, completed=2, 其他=1
      const sa = a.status === 'active' ? 0 : a.status === 'completed' ? 2 : 1
      const sb = b.status === 'active' ? 0 : b.status === 'completed' ? 2 : 1
      if (sa !== sb) return sa - sb
      // 组内按 endDate 升序，无 endDate 的排最后
      const ta = String(a.endDate || '')
      const tb = String(b.endDate || '')
      if (!ta && !tb) return 0
      if (!ta) return 1
      if (!tb) return -1
      return ta.localeCompare(tb)
    })
  }

  return plans
})

function clearFilters() {
  searchQuery.value = ''
  filterStatus.value = ''
  filterCategory.value = ''
  filterLevel.value = ''
  filterPriority.value = ''
  sortField.value = ''
  sortDirection.value = 'desc'
}

// ===== 表格横向滚动 =====
function handleTableWheel(e) {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.currentTarget.scrollLeft += e.deltaY
    e.preventDefault()
  }
}

// ===== 格式化 =====
function formatTime(val) {
  if (!val) return '—'
  const s = String(val)
  if (s.includes('T')) {
    return dayjs(s).format('YYYY-MM-DD HH:mm')
  }
  if (s.length === 10) {
    return s + ' 00:00'
  }
  if (s.length === 16) return s.replace('T', ' ')
  return s.slice(0, 16).replace('T', ' ')
}

// ===== 添加/编辑计划 =====
const showPlanModal = ref(false)
const editingPlanId = ref(null)
const planForm = ref(getEmptyForm())

// ===== 计划/任务配置弹窗（v5.0.123 从「平台设置」迁移至此） =====
const showPlanConfigModal = ref(false)
const showExportMenu = ref(false)

// ===== 每日打卡设置弹窗 =====
const showDailyCheckinSettings = ref(false)
const showAllSummariesModal = ref(false)

// 打卡状态配置函数（复用 settingsStore.setTaskStates）
function updateTaskStateItem(i, patch) {
  const list = settingsStore.taskStates.map((it, idx) => idx === i ? { ...it, ...patch } : it)
  settingsStore.setTaskStates(list)
}
function moveTaskStateItem(i, dir) {
  const arr = [...settingsStore.taskStates]
  if (i + dir < 0 || i + dir >= arr.length) return
  const [m] = arr.splice(i, 1)
  arr.splice(i + dir, 0, m)
  arr.forEach((it, idx) => { it.order = idx })
  settingsStore.setTaskStates(arr)
}
function addTaskStateItem() {
  // 行内追加新状态（参考组会纪要模板配置新增方式，无需 prompt）
  const newItem = { id: uid(), name: '新状态', color: '#6B7280', order: settingsStore.taskStates.length }
  settingsStore.setTaskStates([...settingsStore.taskStates, newItem])
}
function deleteTaskStateItem(i) {
  if (settingsStore.taskStates.length <= 1) { alert('至少保留一项状态'); return }
  if (confirm('确定删除该状态吗？已有打卡记录如使用此状态 ID 将显示为灰色默认样式。')) {
    const list = settingsStore.taskStates.filter((_, idx) => idx !== i)
    list.forEach((it, idx) => { it.order = idx })
    settingsStore.setTaskStates(list)
  }
}
function resetTaskStatesAll() {
  if (confirm('确定恢复打卡状态为默认值吗？')) settingsStore.resetTaskConfig()
}

// 所有今日总结（按日期降序）
const allDailySummaries = computed(() => {
  return [...planStore.dailySummaries].sort((a, b) => b.date.localeCompare(a.date))
})
// 最近几条今日总结（总览右半侧用）
const recentDailySummaries = computed(() => allDailySummaries.value.slice(0, 5))

// ===== 计划库表格列显示配置 =====
const PLAN_BASE_COLUMNS = [
  { key: 'seq', label: '编号' },
  { key: 'status', label: '状态' },
  { key: 'title', label: '任务主题' },
  { key: 'acceptTime', label: '接受任务时间' },
  { key: 'endDate', label: '任务结束时间' },
  { key: 'category', label: '分类' },
  { key: 'level', label: '层级' },
  { key: 'priority', label: '优先级' },
  { key: 'subtask1', label: '子任务1' },
  { key: 'subtask2', label: '子任务2' },
  { key: 'subtask3', label: '子任务3' },
  { key: 'subtask4', label: '子任务4' },
  { key: 'subtask5', label: '子任务5' },
  { key: 'subtask6', label: '子任务6' },
  { key: 'actions', label: '操作' },
]
const planColumnList = computed(() => {
  const colMap = {}
  PLAN_BASE_COLUMNS.forEach(c => { colMap[c.key] = c })
  const result = []
  for (const key of settingsStore.planVisibleColumns) {
    if (colMap[key]) result.push(colMap[key])
  }
  for (const c of PLAN_BASE_COLUMNS) {
    if (!result.find(r => r.key === c.key)) result.push(c)
  }
  return result
})
function planColumnVisible(key) {
  return settingsStore.planVisibleColumns.includes(key)
}
function togglePlanColumn(key) {
  const cols = [...settingsStore.planVisibleColumns]
  const idx = cols.indexOf(key)
  if (idx >= 0) cols.splice(idx, 1)
  else cols.push(key)
  settingsStore.setPlanVisibleColumns(cols)
}
function movePlanColumn(i, dir) {
  const options = planColumnList.value
  const fromKey = options[i].key
  const cols = [...settingsStore.planVisibleColumns]
  const fromPos = cols.indexOf(fromKey)
  const targetIdx = i + dir
  if (fromPos >= 0) {
    if (targetIdx >= 0 && targetIdx < cols.length) {
      cols.splice(fromPos, 1)
      cols.splice(targetIdx, 0, fromKey)
    }
  } else if (targetIdx >= 0 && targetIdx < cols.length) {
    cols.splice(targetIdx, 0, fromKey)
  }
  settingsStore.setPlanVisibleColumns(cols)
}
function resetPlanColumns() {
  settingsStore.setPlanVisibleColumns(PLAN_BASE_COLUMNS.map(c => c.key))
}
const planVisibleColumnCount = computed(() => settingsStore.planVisibleColumns.length || 1)

const planConfigGroups = [
  {
    title: '计划配置',
    icon: 'calendar-days',
    sections: [
      { key: 'planStatuses', title: '计划状态', label: '状态', withValue: false },
      { key: 'planCategories', title: '计划分类', label: '分类', withValue: false },
      { key: 'planLevels', title: '计划层级', label: '层级', withValue: false },
      { key: 'planPriorities', title: '计划优先级', label: '优先级', withValue: true },
      { key: 'subtaskColors', title: '子任务填充色', label: '填充色', withValue: false },
    ],
  },
  {
    title: '任务配置',
    icon: 'list-checks',
    sections: [
      { key: 'taskCategories', title: '任务分类', label: '分类', withValue: false },
      { key: 'taskPriorities', title: '任务优先级', label: '优先级', withValue: true },
    ],
  },
]
const planConfigSetter = {
  planStatuses: 'setPlanStatuses', planCategories: 'setPlanCategories', planLevels: 'setPlanLevels',
  planPriorities: 'setPlanPriorities', subtaskColors: 'setSubtaskColors',
  taskCategories: 'setTaskCategories', taskPriorities: 'setTaskPriorities',
}
function commitPlanConfig(key, list) {
  settingsStore[planConfigSetter[key]](list)
}
function updatePlanConfigItem(key, i, patch) {
  const list = settingsStore[key].map((it, idx) => idx === i ? { ...it, ...patch } : it)
  commitPlanConfig(key, list)
}
function movePlanConfigItem(key, i, dir) {
  const arr = [...settingsStore[key]]
  if (i + dir < 0 || i + dir >= arr.length) return
  const [m] = arr.splice(i, 1)
  arr.splice(i + dir, 0, m)
  arr.forEach((it, idx) => { it.order = idx })
  commitPlanConfig(key, arr)
}
function addPlanConfigItem(key, withValue, label) {
  // 行内追加新配置项（参考组会纪要模板配置新增方式，无需 prompt）
  const base = { id: uid(), name: '新' + (label || '项目'), color: '#6B7280', order: settingsStore[key].length }
  if (withValue) base.value = 1
  commitPlanConfig(key, [...settingsStore[key], base])
}
function deletePlanConfigItem(key, i, label) {
  if (settingsStore[key].length <= 1) { alert('至少保留一项' + label); return }
  if (confirm(`确定删除该${label}吗？`)) {
    const list = settingsStore[key].filter((_, idx) => idx !== i)
    list.forEach((it, idx) => { it.order = idx })
    commitPlanConfig(key, list)
  }
}
function resetPlanConfigAll() {
  if (confirm('确定恢复全部计划配置为默认值吗？自定义的状态/分类/层级/优先级与子任务填充色将丢失。')) settingsStore.resetPlanConfig()
}
function resetSubtaskColorsAll() {
  if (confirm('确定恢复子任务填充色为默认值吗？')) settingsStore.resetSubtaskColors()
}
function resetTaskConfigAll() {
  if (confirm('确定恢复任务分类和优先级为默认值吗？')) settingsStore.resetTaskConfig()
}

// ===== 消息中心提醒设置 =====
const planRemindDaysAhead = computed(() => {
  const v = settingsStore.planReminder?.remindDaysAhead
  return (typeof v === 'number' && v > 0) ? v : 8
})
const planUrgentDays = computed(() => Math.min(3, planRemindDaysAhead.value))
function setRemindDays(v) {
  const n = parseInt(v)
  settingsStore.setPlanReminder({ remindDaysAhead: (isNaN(n) || n < 1) ? 8 : Math.min(n, 60) })
}
function updateRemindColor(key, color) {
  const colors = { ...(settingsStore.planReminder?.remindColors || {}) }
  colors[key] = color
  settingsStore.setPlanReminder({ remindColors: colors })
}
function resetPlanReminderColors() {
  if (confirm('确定恢复提醒颜色为默认值吗？')) {
    settingsStore.setPlanReminder({
      remindColors: { near: '#F59E0B', urgent: '#EF4444', overdue: '#8B5CF6', severe: '#DC2626' },
    })
  }
}
function remindStatusChecked(id) {
  const list = settingsStore.planReminder?.remindStatuses
  return Array.isArray(list) ? list.includes(id) : !['completed', 'abandoned'].includes(id)
}
function toggleRemindStatus(id) {
  const list = Array.isArray(settingsStore.planReminder?.remindStatuses) && settingsStore.planReminder.remindStatuses.length > 0
    ? [...settingsStore.planReminder.remindStatuses]
    : settingsStore.planStatuses.filter(s => s.id !== 'completed' && s.id !== 'abandoned').map(s => s.id)
  const idx = list.indexOf(id)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(id)
  settingsStore.setPlanReminder({ remindStatuses: list })
}

function getEmptyForm() {
  return {
    title: '', description: '',
    category: sortedPlanCategories.value[0]?.id || 'other',
    level: sortedPlanLevels.value[0]?.id || 'day',
    priority: sortedPlanPriorities.value[0]?.value || 2,
    startDate: todayStr(), endDate: '',
    acceptTime: dayjs().format('YYYY-MM-DDTHH:mm'),
    subtasks: Array.from({ length: 6 }, () => ({ text: '', color: '', date: '' })),
    status: 'active',
  }
}

function toggleExportMenu() { showExportMenu.value = !showExportMenu.value }
function exportMarkdown() {
  showExportMenu.value = false
  const plans = filteredPlans.value
  if (plans.length === 0) { alert('没有可导出的计划'); return }
  let md = '# <AppIcon name="file-text" />  计划列表导出\n\n> 导出时间：' + new Date().toLocaleString() + '  |  共 ' + plans.length + ' 条计划\n\n---\n\n'
  plans.forEach((p, i) => {
    md += '## ' + (i + 1) + '. ' + (p.title || '未命名计划') + '\n\n| 字段 | 内容 |\n|------|------|\n'
    md += '| 状态 | ' + getStatusName(p.status) + ' |\n'
    md += '| 分类 | ' + getCategoryName(p.category) + ' |\n'
    md += '| 层级 | ' + getLevelName(p.level) + ' |\n'
    md += '| 优先级 | ' + getPriorityName(p.priority) + ' |\n'
    md += '| 开始日期 | ' + (p.startDate || '—') + ' |\n'
    md += '| 结束日期 | ' + (p.endDate || '—') + ' |\n'
    md += '| 描述 | ' + (p.description || '—') + ' |\n'
    md += '| 子任务 | ' + (p.subtasks || []).filter(s => s.text).map(s => s.text).join('；') + ' |\n'
    md += '| 备注 | ' + (p.notes || '—') + ' |\n\n'
  })
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '计划列表_' + todayStr() + '.md'; a.click()
  URL.revokeObjectURL(url)
}
function exportPdf() {
  showExportMenu.value = false
  const plans = filteredPlans.value
  if (plans.length === 0) { alert('没有可导出的计划'); return }
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>计划列表</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;padding:40px;color:#1F2937;max-width:900px;margin:0 auto}' +
    'h1{font-size:26px;margin-bottom:8px}.meta{color:#9CA3AF;font-size:13px;margin-bottom:30px}' +
    'h2{font-size:17px;margin:24px 0 10px;color:#4B5563;border-bottom:1px solid #E5E7EB;padding-bottom:6px}' +
    'table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}td,th{border:1px solid #E5E7EB;padding:8px 10px;text-align:left}th{background:#F3F4F6;color:#6B7280;width:100px}</style></head><body>' +
    '<h1>计划列表</h1><div class="meta">导出时间：' + new Date().toLocaleString() + ' &nbsp;|&nbsp; 共 ' + plans.length + ' 条计划</div>'
  plans.forEach((p, i) => {
    html += '<h2>' + (i + 1) + '. ' + (p.title || '未命名计划') + '</h2><table>'
    html += '<tr><th>状态</th><td>' + getStatusName(p.status) + '</td></tr>'
    html += '<tr><th>分类</th><td>' + getCategoryName(p.category) + '</td></tr>'
    html += '<tr><th>层级</th><td>' + getLevelName(p.level) + '</td></tr>'
    html += '<tr><th>优先级</th><td>' + getPriorityName(p.priority) + '</td></tr>'
    html += '<tr><th>开始日期</th><td>' + (p.startDate || '—') + '</td></tr>'
    html += '<tr><th>结束日期</th><td>' + (p.endDate || '—') + '</td></tr>'
    html += '<tr><th>描述</th><td>' + (p.description || '—') + '</td></tr>'
    html += '<tr><th>子任务</th><td>' + (p.subtasks || []).filter(s => s.text).map(s => s.text).join('；') + '</td></tr>'
    html += '<tr><th>备注</th><td>' + (p.notes || '—') + '</td></tr>'
    html += '</table>'
  })
  html += '</body></html>'
  printHtml(html)
}

function openAddPlan() {
  editingPlanId.value = null
  planForm.value = getEmptyForm()
  showPlanModal.value = true
}

function openEditPlan(plan) {
  editingPlanId.value = plan.id
  const st = plan.subtasks || Array.from({ length: 6 }, () => ({ text: '', color: '', date: '' }))
  planForm.value = {
    title: plan.title || '',
    description: plan.description || '',
    category: normalizeCategory(plan.category) || sortedPlanCategories.value[0]?.id || 'other',
    level: plan.level || sortedPlanLevels.value[0]?.id || 'day',
    priority: plan.priority || sortedPlanPriorities.value[0]?.value || 2,
    startDate: plan.startDate || todayStr(),
    endDate: plan.endDate ? String(plan.endDate).slice(0, 16) : '',
    acceptTime: (plan.acceptTime || plan.createdAt) ? dayjs(plan.acceptTime || plan.createdAt).format('YYYY-MM-DDTHH:mm') : '',
    subtasks: st.map(s => typeof s === 'string' ? { text: s, color: '', date: '' } : { text: s.text || '', color: s.color || '', date: s.date || '' }),
    status: plan.status || 'active',
  }
  showPlanModal.value = true
}

function savePlan() {
  if (!planForm.value.title.trim()) return
  const form = planForm.value
  const data = {
    title: form.title,
    description: form.description,
    category: form.category,
    level: form.level,
    priority: form.priority,
    startDate: form.startDate,
    endDate: form.endDate || null,
    acceptTime: form.acceptTime ? dayjs(form.acceptTime).format('YYYY-MM-DD HH:mm') : nowStr(),
    subtasks: form.subtasks.map(s => {
      const text = (s && s.text) || ''
      let color = (s && s.color) || ''
      const date = (s && s.date) || ''
      // 新增计划 + 有文字 + 无颜色 → 默认"待处理"（黄色）
      if (!editingPlanId.value && text && !color) {
        const yellow = (settingsStore.subtaskColors || []).find(c => c.id === 'yellow')
        color = (yellow && yellow.color) || '#F59E0B'
      }
      return { text, color, date }
    }),
    status: form.status,
  }
  if (editingPlanId.value) {
    planStore.updatePlan(editingPlanId.value, data)
  } else {
    planStore.addPlan(data)
  }
  showPlanModal.value = false
}

function confirmDeletePlan(plan) {
  if (confirm(`确定删除计划「${plan.title}」吗？`)) {
    planStore.deletePlan(plan.id)
  }
}

function deletePlanFromEdit() {
  if (confirm(`确定删除计划「${planForm.value.title}」吗？`)) {
    planStore.deletePlan(editingPlanId.value)
    showPlanModal.value = false
  }
}

// ===== 日历视图事件 =====
function onCalendarAdd(dateStr) {
  planForm.value = {
    ...getEmptyForm(),
    startDate: dateStr,
    endDate: dateStr,
    acceptTime: dayjs(dateStr).format('YYYY-MM-DDTHH:mm'),
  }
  editingPlanId.value = null
  showPlanModal.value = true
}
function onCalendarEdit(plan) {
  openEditPlan(plan)
}
</script>

<style scoped>
/* ===== 页面布局 ===== */
.plan-page { max-width: 100%; padding: 0 4px; }

/* ===== Tab 栏：胶囊样式 ===== */
.tab-bar { display: flex; justify-content: center; margin-bottom: 20px; }
.tab-pill {
  display: inline-flex;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  padding: 4px;
  gap: 4px;
}
.tab-btn {
  padding: 8px 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 120px;
  text-align: center;
}
.tab-btn:hover { color: var(--color-text-primary); background: rgba(0,0,0,0.03); }
.tab-btn.active {
  color: #fff;
  background: var(--color-primary);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

/* ===== 卡片 ===== */
.section-card { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; }
.card-header-actions { display: flex; gap: 8px; align-items: center; }

/* 计划库头部按钮（简笔画图标 + 文字） */
.header-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 10px;
  border: 1px solid rgba(124, 58, 237, 0.18);
  background: rgba(255, 255, 255, 0.55);
  color: var(--color-text-primary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s ease; backdrop-filter: blur(4px);
}
.header-btn:hover { background: rgba(255, 255, 255, 0.9); border-color: rgba(124, 58, 237, 0.35); }
.header-btn-primary {
  background: var(--color-primary); border-color: transparent; color: #fff;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}
.header-btn-primary:hover { background: var(--color-primary); opacity: 0.9; }
.export-dropdown { position: relative; display: inline-block; }
.export-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: rgba(255, 255, 255, 0.92); border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-md); z-index: 10; min-width: 150px; overflow: hidden; }
.export-menu button { display: block; width: 100%; padding: 10px 14px; border: none; background: none; text-align: left; font-size: 13px; cursor: pointer; color: var(--color-text-primary); }
.export-menu button:hover { background: var(--color-bg-hover); }

/* ===== 总览 ===== */
.overview-grid { display: grid; grid-template-columns: 420px 1fr; gap: 20px; align-items: stretch; }

.chart-card { display: flex; flex-direction: column; }
.chart-wrap { display: flex; justify-content: center; padding: 8px 0; flex: 1; }
.chart-el { width: 100%; height: 220px; }

.chart-legend { display: flex; gap: 16px; justify-content: center; margin-top: 8px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-name { color: var(--color-text-secondary); }
.legend-count { font-weight: 600; }

/* 统计卡片：两行四列 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 12px;
}
.stat-card {
  padding: 16px 12px;
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  text-align: center;
  transition: box-shadow var(--transition-fast);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}
.stat-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.stat-card.clickable { cursor: pointer; }
.stat-card.clickable:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.10); transform: translateY(-1px); }
.stat-label { font-size: 13px; color: var(--color-text-secondary); margin-bottom: 6px; }
.stat-num { font-size: 28px; font-weight: 700; line-height: 1.2; }

/* 统计明细弹窗 */
.stat-detail-modal { max-width: 560px; max-height: 80vh; display: flex; flex-direction: column; }
.stat-detail-list { display: flex; flex-direction: column; gap: 8px; max-height: 58vh; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
.stat-detail-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: var(--color-bg); border-radius: var(--radius-md); cursor: pointer;
  transition: background var(--transition-fast); border-left: 3px solid transparent;
}
.stat-detail-item:hover { background: var(--color-bg-hover); }
.stat-detail-item.item-overdue { border-left-color: #F59E0B; }
.stat-detail-item.item-completed { opacity: 0.7; }
.sd-seq { font-size: 12px; color: var(--color-text-tertiary); font-family: var(--font-mono); min-width: 32px; flex-shrink: 0; }
.sd-title { flex: 1; min-width: 0; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-deadline { font-size: 12px; color: var(--color-text-tertiary); flex-shrink: 0; }

/* 总览底部双列布局 */
.overview-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; align-items: stretch; }
.recent-plans-card { margin-top: 0; }
.recent-summaries-card { margin-top: 0; }

/* 最近打卡总结列表（总览右半侧） */
.recent-summary-list { display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; }
.recent-summary-item {
  padding: 12px 14px; background: var(--color-bg); border-radius: var(--radius-md);
  border-left: 3px solid var(--color-primary);
}
.rs-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.rs-date { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.rs-time { font-size: 11px; color: var(--color-text-tertiary); }
.rs-section { display: flex; flex-direction: column; gap: 2px; margin-bottom: 4px; font-size: 12px; line-height: 1.5; }
.rs-label { color: var(--color-text-tertiary); font-weight: 600; flex-shrink: 0; }
.rs-text { color: var(--color-text-secondary); word-break: break-all; white-space: pre-wrap; }

/* 所有今日总结弹窗列表 */
.all-summary-list { display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; margin: 0 -4px; padding: 0 4px; }
.all-summary-item {
  padding: 14px 16px; background: var(--color-bg); border-radius: var(--radius-md);
  border-left: 3px solid var(--color-primary);
}
.as-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.as-date { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.as-time { font-size: 11px; color: var(--color-text-tertiary); }
.as-section { display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px; font-size: 13px; line-height: 1.5; }
.as-label { color: var(--color-text-tertiary); font-weight: 600; flex-shrink: 0; }
.as-text { color: var(--color-text-secondary); word-break: break-all; white-space: pre-wrap; }

/* 近期任务列表 */
.recent-plan-list { display: flex; flex-direction: column; gap: 8px; }
.recent-plan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  border-left: 3px solid transparent;
}
.recent-plan-item:hover { background: var(--color-bg-hover); }
.recent-plan-item.row-overdue { border-left-color: #F59E0B; }
.rp-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.rp-seq { font-size: 12px; color: var(--color-text-tertiary); font-family: var(--font-mono); min-width: 32px; }
.rp-title { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rp-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.rp-category, .rp-level, .rp-priority {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}
.rp-time { font-size: 12px; color: var(--color-text-tertiary); }

/* ===== 筛选栏 ===== */
.filter-bar { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.filter-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.filter-select { width: 140px; flex-shrink: 0; }
.sort-dir-btn { min-width: 72px; }
.plan-count-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-left: auto;
  white-space: nowrap;
}

/* ===== 表格 ===== */
.plan-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  max-width: 100%;
}
.plan-table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: auto;
}
.plan-table th {
  position: sticky;
  top: 0;
  background: var(--color-bg);
  padding: 10px 8px;
  text-align: center;
  white-space: nowrap;
  border-bottom: 2px solid var(--color-border);
  font-weight: 600;
  font-size: 12px;
  color: var(--color-text-secondary);
  z-index: 1;
}
.plan-table td {
  padding: 9px 8px;
  border-bottom: 1px solid var(--color-border-light);
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
}
.plan-table tbody tr:hover { background: var(--color-bg-hover); }
.row-overdue { background: rgba(245, 158, 11, 0.05); }

/* 列宽 */
.col-seq { width: 56px; }
.col-status { width: 80px; }
.col-title { min-width: 200px; max-width: 360px; }
.col-accept-time { width: 150px; }
.col-end-date { width: 150px; }
.col-category { width: 90px; }
.col-level { width: 80px; }
.col-priority { width: 68px; }
.col-subtask { min-width: 120px; max-width: 180px; }
.col-actions { width: 80px; }

/* 标题列 */
.plan-title-cell { display: flex; flex-direction: column; gap: 2px; align-items: center; }
.plan-title-text { font-weight: 500; }
.plan-desc-preview { font-size: 11px; color: var(--color-text-tertiary); max-width: 300px; overflow: hidden; text-overflow: ellipsis; }

/* 标签 */
.status-tag, .category-tag, .level-tag, .priority-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: transform .1s, box-shadow .1s;
}
.status-tag:hover, .category-tag:hover, .level-tag:hover, .priority-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* 单元格快捷选择弹窗 */
.cell-picker-wrap { position: relative; display: inline-block; }
.cell-picker {
  position: fixed;
  z-index: 99999;
  min-width: 120px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 4px 0;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.cell-picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 7px 14px;
  font-size: 12px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
  text-align: center;
}
.cell-picker-item:hover { background: var(--color-bg-hover); }
.cell-picker-item.active { font-weight: 600; color: var(--color-primary); }
.cell-picker-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cell-picker-label { text-align: center; }

/* 子任务单元格 + 颜色填充弹窗 */
.subtask-cell {
  min-height: 44px;
  padding: 6px 6px 4px;
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 2px;
}
.subtask-cell:hover { border-color: var(--color-primary); }
.subtask-cell.filled {
  border-style: solid;
  border-color: transparent;
  font-weight: 600;
}
.subtask-text {
  font-size: 12px;
  line-height: 1.25;
  word-break: break-word;
}
.subtask-date {
  font-size: 10px;
  line-height: 1.1;
  opacity: 0.78;
}
.subtask-picker { min-width: 200px; padding: 6px; }
.subtask-color-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}
.subtask-color-item:hover { background: var(--color-bg-hover); }
.subtask-color-item.active { font-weight: 600; color: var(--color-primary); }
.subtask-color-dot {
  width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.1);
}
.subtask-color-dot.clear-dot {
  display: flex; align-items: center; justify-content: center;
  background: var(--color-bg); color: var(--color-danger); font-size: 10px;
}
.subtask-color-label { flex: 1; text-align: left; }
.custom-item { position: relative; }
.subtask-color-input {
  width: 24px; height: 22px; padding: 0; border: 1px solid var(--color-border-light);
  border-radius: 4px; background: none; cursor: pointer;
}
.picker-divider { height: 1px; background: var(--color-border-light); margin: 4px 0; }
.subtask-date-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
}
.subtask-date-input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #ffffff;
  color: rgba(0, 0, 0, 0.88);
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.subtask-date-input:hover { border-color: #4096ff; }
.subtask-date-input:focus {
  border-color: #5B5FEF;
  box-shadow: 0 0 0 2px rgba(91, 95, 239, 0.1);
}
.subtask-date-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.2s;
}
.subtask-date-input:hover::-webkit-calendar-picker-indicator { opacity: 0.85; }
.subtask-date-input:focus::-webkit-calendar-picker-indicator { opacity: 1; }
.clear-item { border-top: none; margin-top: 0; padding-top: 7px; }

/* ===== 每日打卡 ===== */
.tab-btn { min-width: 100px; padding: 8px 24px; }

.daily-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
.daily-card { display: flex; flex-direction: column; }

.daily-progress-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
}
.daily-progress-num { font-size: 28px; font-weight: 700; color: var(--color-text-primary); }
.daily-progress-bar {
  flex: 1; height: 8px; background: var(--color-bg); border-radius: 4px; overflow: hidden;
}
.daily-progress-fill { height: 100%; background: #10B981; border-radius: 4px; transition: width 0.3s; }
.daily-progress-status {
  font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: var(--radius-full);
}
.daily-streak-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 10px; background: rgba(16,185,129,0.10); border-radius: var(--radius-md);
  font-size: 13px; color: #047857; margin-bottom: 14px;
}

.daily-task-list { display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto; max-height: 320px; }
.daily-task-item {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 10px 12px; background: var(--color-bg); border-radius: var(--radius-md);
  border-left: 3px solid transparent; transition: background var(--transition-fast);
}
.daily-task-item:hover { background: var(--color-bg-hover); }
.daily-task-item.clickable { cursor: pointer; }
.daily-task-item.task-completed { border-left-color: #10B981; }
.dt-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.dt-title { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dt-title.line-through { text-decoration: line-through; color: var(--color-text-tertiary); }
.dt-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.dt-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
.dt-plan-tag {
  background: rgba(139,92,246,0.12); color: #8B5CF6;
  flex-shrink: 0; max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dt-plan-tag.dt-plan-removed { background: var(--color-bg); color: var(--color-text-tertiary); }
.dt-action {
  width: 26px; height: 26px; border-radius: 6px; border: 0.5px solid var(--color-border-light);
  background: transparent; color: var(--color-text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast);
}
.dt-action:hover { background: var(--color-bg-hover); color: var(--color-primary); }
.dt-action.dt-delete:hover { color: var(--color-danger); }
.dt-action.dt-action-done { background: rgba(16,185,129,0.12); color: #059669; border-color: rgba(16,185,129,0.3); }
.dt-action.dt-action-undone { background: rgba(245,158,11,0.12); color: #d97706; border-color: rgba(245,158,11,0.3); }

/* 底线任务状态标签（可点击，弹出状态菜单） */
.dt-status-toggle {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  user-select: none;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  transition: filter var(--transition-fast), box-shadow var(--transition-fast);
  white-space: nowrap;
}
.dt-status-toggle:hover { filter: brightness(0.95); box-shadow: 0 0 0 1px rgba(0,0,0,0.08); }

/* 状态选择浮层（点击状态标签后弹出，fixed 全屏定位） */
.dt-state-menu {
  position: fixed;
  z-index: 2150;
  min-width: 132px;
  padding: 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 24px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.08);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.dt-state-menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 7px 14px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: filter var(--transition-fast), opacity var(--transition-fast);
  margin-bottom: 3px;
  white-space: nowrap;
}
.dt-state-menu-item:last-child { margin-bottom: 0; }
.dt-state-menu-item:hover { filter: brightness(0.92); }
.dt-state-menu-item.dt-state-menu-active {
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.35) inset;
  font-weight: 700;
}

/* 放弃态任务条目样式 */
.daily-task-item.task-abandoned { border-left-color: #EF4444; opacity: 0.82; }
.daily-task-item.task-abandoned .dt-title { text-decoration: line-through; color: var(--color-text-tertiary); }

.daily-add-row { display: flex; gap: 8px; margin-top: 12px; align-items: center; }

.daily-form { display: flex; flex-direction: column; gap: 10px; }
.daily-display-box {
  padding: 10px 12px; min-height: 40px;
  background: var(--color-bg); border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md); font-size: 13px; color: var(--color-text-primary);
  line-height: 1.5; white-space: pre-wrap;
}
.daily-display-box:empty::before { content: '暂无记录'; color: var(--color-text-tertiary); }
.daily-status-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500;
}
.daily-status-badge.filled { background: rgba(16,185,129,0.12); color: #10B981; }
.daily-status-badge.empty { background: rgba(245,158,11,0.12); color: #F59E0B; }

.daily-top-actions {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 16px 20px;
}
.daily-top-title {
  font-size: 18px; font-weight: 700; color: var(--color-text-primary);
  margin: 0; letter-spacing: 0.5px;
}
.daily-top-btns { display: flex; gap: 10px; flex-wrap: wrap; }
.daily-top-actions .header-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 10px;
  border: 1px solid rgba(124, 58, 237, 0.18);
  background: rgba(255, 255, 255, 0.55);
  color: var(--color-text-primary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s ease; backdrop-filter: blur(4px);
}
.daily-top-actions .header-btn:hover { background: rgba(255, 255, 255, 0.9); border-color: rgba(124, 58, 237, 0.35); }

/* 日/周历史切换按钮 */
.view-switch { display: flex; align-items: center; gap: 6px; }
.view-switch-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px;
  border: 1px solid var(--color-border-light); background: var(--color-bg);
  color: var(--color-text-secondary); cursor: pointer;
  transition: all 0.15s ease;
}
.view-switch-btn:hover:not(:disabled) { color: var(--color-primary); border-color: rgba(124, 58, 237, 0.35); background: rgba(124, 58, 237, 0.06); }
.view-switch-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.view-switch-today {
  padding: 4px 10px; border-radius: 8px; font-size: 12px;
  border: 1px solid rgba(124, 58, 237, 0.25); background: rgba(124, 58, 237, 0.08);
  color: var(--color-primary); cursor: pointer; transition: all 0.15s ease;
}
.view-switch-today:hover { background: rgba(124, 58, 237, 0.15); }
.weekly-card { margin-top: 20px; }
.weekly-days-row {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 14px;
}
.weekly-day-cell {
  text-align: center; padding: 10px 4px; border-radius: var(--radius-md);
  background: var(--color-bg); border: 0.5px solid var(--color-border-light);
}
.weekly-day-cell.today { border-color: var(--color-primary); background: rgba(37,99,235,0.06); }
.weekly-day-cell.future { background: rgba(37,99,235,0.04); }
.weekly-day-name { font-size: 11px; color: var(--color-text-tertiary); }
.weekly-day-ratio { font-size: 16px; font-weight: 700; }
.weekly-stats-row { display: flex; gap: 10px; }
.weekly-stat {
  flex: 1; padding: 12px 14px; background: var(--color-bg); border-radius: var(--radius-md);
  display: flex; flex-direction: column; gap: 2px;
}
.weekly-stat-label { font-size: 11px; color: var(--color-text-tertiary); }
.weekly-stat-num { font-size: 22px; font-weight: 700; }

.history-card { margin-top: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.history-tabs { display: inline-flex; gap: 6px; }
.history-tab {
  font-size: 12px; padding: 4px 12px; border-radius: var(--radius-md);
  border: 0.5px solid var(--color-border-light); background: transparent; color: var(--color-text-secondary);
  cursor: pointer;
}
.history-tab.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.history-list { display: flex; flex-direction: column; gap: 8px; }
.history-item {
  display: flex; gap: 12px; padding: 10px 12px; background: var(--color-bg); border-radius: var(--radius-md);
  align-items: center;
}
.history-date { font-size: 12px; color: var(--color-text-tertiary); min-width: 70px; flex-shrink: 0; }
.history-body { flex: 1; min-width: 0; }
.history-title { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.history-meta { font-size: 11px; color: var(--color-text-tertiary); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.history-ratio { font-size: 13px; font-weight: 700; flex-shrink: 0; min-width: 36px; text-align: right; }

@media (max-width: 1100px) {
  .stats-section { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 900px) {
  .daily-grid { grid-template-columns: 1fr; }
  .overview-grid { grid-template-columns: 1fr; }
  .overview-bottom-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .stats-section { grid-template-columns: 1fr; }
}

/* ===== 弹窗置顶 ===== */
.plan-modal-overlay { z-index: 2000; }
.plan-config-overlay { z-index: 2100; }

/* ===== 配置弹窗标题图标 ===== */
.plan-config-overlay .cfg-group-title { display: flex; align-items: center; gap: 8px; }
.plan-config-overlay .cfg-group-title svg { color: var(--color-primary); flex-shrink: 0; }

/* ===== 消息中心提醒设置 ===== */
.reminder-config { display: flex; flex-direction: column; gap: 16px; }
.reminder-days-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.reminder-days-label { font-size: 13px; color: var(--color-text-secondary); white-space: nowrap; }
.reminder-days-row .cfg-val { width: 70px; text-align: center; }

/* ===== 表单 ===== */
.form-group { display: flex; flex-direction: column; }
.form-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 4px; }

/* ===== 毛玻璃适配：筛选栏 + 编辑弹窗 select + cell-picker ===== */
/* 毛玻璃模式：筛选栏 select 下拉框半透明 + 模糊 */
.app-container.module-frosted .plan-page select.filter-select,
.app-container.module-frosted .plan-page select.input,
.app-container.module-frosted .plan-modal-overlay select.input {
  background: rgba(255, 255, 255, var(--module-opacity, 0.88)) !important;
  backdrop-filter: blur(14px) !important;
  -webkit-backdrop-filter: blur(14px) !important;
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
}
/* 毛玻璃模式：cell-picker 弹出层（状态/分类/层级/优先级 快捷选择，经 Teleport 挂载到 body）
   注意：cell-picker 通过 <Teleport to="body"> 挂载到 body，已脱离 .app-container DOM 树，
   故选择器需用 body.module-frosted 前缀而非 .app-container.module-frosted */
body.module-frosted .cell-picker {
  background: rgba(255, 255, 255, var(--module-opacity, 0.88)) !important;
  backdrop-filter: blur(14px) !important;
  -webkit-backdrop-filter: blur(14px) !important;
  border: 1px solid rgba(255, 255, 255, 0.55) !important;
}
</style>
