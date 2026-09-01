<template>
  <div class="points-page">
    <!-- 积分概览 -->
    <div class="card section-card overview-card">
      <div class="overview-top">
        <div class="overview-main">
          <div class="overview-level" :style="{ color: pointsStore.level.color }">
            <span class="level-num">Lv.{{ pointsStore.level.level }}</span>
            <span class="level-name">{{ pointsStore.level.name }}</span>
          </div>
          <div class="overview-points">
            <span class="points-big">{{ pointsStore.totalPoints }}</span>
            <span class="points-label">总积分</span>
          </div>
          <div class="level-progress-bar">
            <div class="progress-bar" style="height: 10px;">
              <div class="progress-bar-fill" :style="{ width: pointsStore.levelProgress + '%', background: pointsStore.level.color }"></div>
            </div>
            <div class="progress-info">
              <span>距「{{ nextLevelName }}」还差 {{ pointsStore.pointsToNextLevel }} 分</span>
              <span>{{ pointsStore.levelProgress }}%</span>
            </div>
          </div>
        </div>
        <div class="overview-stats">
          <div class="stat-box">
            <span class="stat-num">{{ pointsStore.todayPoints }}</span>
            <span class="stat-desc">今日赚取</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{{ pointsStore.weekPoints }}</span>
            <span class="stat-desc">本周赚取</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 押积分机制 -->
    <div class="card section-card bet-card" :class="{ active: pointsStore.todayBet }">
      <div class="card-header">
        <h2 class="card-title"><AppIcon name="target" />  今日押注</h2>
        <span v-if="pointsStore.todayBet" class="tag" :class="betStatusClass">{{ betStatusText }}</span>
      </div>
      <div class="bet-content" v-if="pointsStore.todayBet">
        <div class="bet-info">
          <div class="bet-amount-display">
            <span class="bet-amount-num">{{ pointsStore.todayBet.amount }}</span>
            <span class="bet-amount-label">分已押注</span>
          </div>
          <div class="bet-task">
            <span class="bet-task-label">押注任务：</span>
            <span class="bet-task-name">{{ betTaskTitle }}</span>
          </div>
          <div class="bet-rule">
            <p><AppIcon name="check-circle" />  晚上10点前完成 → 押{{ pointsStore.todayBet.amount }}分变{{ pointsStore.todayBet.amount * 2 }}分返还</p>
            <p><AppIcon name="x-circle" />  未完成 → 扣除{{ pointsStore.todayBet.amount }}分</p>
          </div>
        </div>
        <div class="bet-actions" v-if="pointsStore.todayBet?.status === 'pending'">
          <button class="btn btn-primary" @click="settleBet(true)">已完成，领取奖励</button>
          <button class="btn btn-ghost" @click="settleBet(false)">承认未完成</button>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-state-icon"><AppIcon name="target" /> </div>
        <p>今天还没有押注，去主页面设置今日押注吧！</p>
      </div>
    </div>

    <!-- 赚积分规则 + 消费商店 -->
    <div class="two-col">
      <div class="card section-card">
        <div class="card-header"><h2 class="card-title"><AppIcon name="coins" />  赚积分规则</h2></div>
        <div class="rules-list">
          <div v-for="rule in earnRules" :key="rule.name" class="rule-item">
            <div class="rule-info">
              <span class="rule-name">{{ rule.name }}</span>
              <span class="rule-desc">{{ rule.desc }}</span>
            </div>
            <span class="rule-points earn">+{{ rule.points }}</span>
          </div>
        </div>
        <div class="bonus-section">
          <h4><AppIcon name="gift" />  额外加分</h4>
          <div v-for="bonus in bonusRules" :key="bonus.name" class="rule-item">
            <div class="rule-info">
              <span class="rule-name">{{ bonus.name }}</span>
              <span class="rule-desc">{{ bonus.desc }}</span>
            </div>
            <span class="rule-points earn">+{{ bonus.points }}</span>
          </div>
        </div>
      </div>

      <div class="card section-card">
        <div class="card-header"><h2 class="card-title"><AppIcon name="shopping-cart" />  积分消费商店</h2></div>
        <div class="shop-list">
          <div v-for="item in shopItems" :key="item.name" class="shop-item">
            <div class="shop-info">
              <span class="shop-icon"><AppIcon v-if="item.icon" :name="item.icon" :size="20" /></span>
              <div>
                <span class="shop-name">{{ item.name }}</span>
                <span class="shop-desc">{{ item.desc }}</span>
              </div>
            </div>
            <button class="btn btn-sm" :class="canAfford(item.cost) ? 'btn-primary' : 'btn-secondary'"
              :disabled="!canAfford(item.cost)" @click="buyItem(item)">
              {{ item.cost }}分
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 等级头衔 -->
    <div class="card section-card">
      <div class="card-header"><h2 class="card-title"><AppIcon name="trophy" />  等级头衔</h2></div>
      <div class="level-timeline">
        <div v-for="lv in levels" :key="lv.name" class="level-timeline-item"
          :class="{ current: pointsStore.level.name === lv.name, passed: pointsStore.totalPoints >= lv.max }">
          <div class="lv-marker" :style="{ background: lv.color }">
            <span v-if="pointsStore.totalPoints >= lv.min">✓</span>
          </div>
          <div class="lv-info">
            <span class="lv-name" :style="{ color: lv.color }">{{ lv.name }}</span>
            <span class="lv-range">{{ lv.min }} - {{ lv.max === Infinity ? '∞' : lv.max }} 分</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 积分流水 -->
    <div class="card section-card">
      <div class="card-header">
        <h2 class="card-title"><AppIcon name="file-text" />  积分流水</h2>
        <div class="filter-tabs">
          <button v-for="f in filters" :key="f.id" class="filter-btn"
            :class="{ active: currentFilter === f.id }" @click="currentFilter = f.id">{{ f.name }}</button>
        </div>
      </div>
      <div class="transaction-list">
        <div v-for="tx in filteredTransactions" :key="tx.id" class="transaction-item">
          <div class="tx-info">
            <span class="tx-reason">{{ tx.reason }}</span>
            <span class="tx-time">{{ tx.time }}</span>
          </div>
          <div class="tx-amount-area">
            <span class="tx-amount" :class="tx.amount > 0 ? 'earn' : 'spend'">
              {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }}
            </span>
            <span class="tx-balance">余额 {{ tx.balance }}</span>
          </div>
        </div>
        <div v-if="filteredTransactions.length === 0" class="empty-state">
          <div class="empty-state-icon"><AppIcon name="bar-chart" /> </div>
          <p>暂无积分记录</p>
        </div>
      </div>
    </div>

    <!-- 购买提示 -->
    <transition name="fade">
      <div v-if="purchaseToast" class="copy-toast">{{ purchaseToast }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePointsStore, useTasksStore } from '../stores'
import { todayStr } from '../utils/storage'
import dayjs from 'dayjs'

const pointsStore = usePointsStore()
const tasksStore = useTasksStore()

const currentFilter = ref('all')
const filters = [
  { id: 'all', name: '全部' },
  { id: 'today', name: '今日' },
  { id: 'week', name: '本周' },
  { id: 'spend', name: '消费' },
]

const purchaseToast = ref('')

const earnRules = [
  { name: '重活', desc: '写完论文核心章节/完整数据分析/投稿返修', points: 100 },
  { name: '中等活', desc: '精读文献写300字思考/过组会PPT/解决Bug', points: 50 },
  { name: '日常活', desc: '完成2小时专注/运动/整理英语句型', points: 20 },
  { name: '好习惯', desc: '7:30前起床/喝水达标/15分钟放松', points: 5 },
  { name: '应答助手', desc: '使用导师应答助手并复制', points: 2 },
  { name: '科研导航', desc: '点击导航网站有效使用（上限10分/日）', points: 1 },
  { name: '赛博算命', desc: '使用占卜并查看完整解读', points: 5 },
]

const bonusRules = [
  { name: '心流专注加成', desc: '番茄钟连续45分钟不碰手机', points: 10 },
  { name: '连续一周成就', desc: '连续7天每天≥50分', points: 100 },
]

const shopItems = [
  { name: '追剧/游戏1小时', desc: '放松一下', cost: 30, icon: '' },
  { name: '奶茶/咖啡', desc: '记账时抵扣', cost: 50, icon: '' },
  { name: '自然醒特权', desc: '明天不用早起', cost: 150, icon: 'moon' },
  { name: '买一本闲书', desc: '非专业书籍', cost: 200, icon: '' },
  { name: '短途一日游', desc: '出去走走', cost: 500, icon: '' },
]

const levels = [
  { name: '起步', min: 0, max: 500, color: '#6B7280' },
  { name: '熟手', min: 500, max: 2000, color: '#059669' },
  { name: '骨干', min: 2000, max: 5000, color: '#2563EB' },
  { name: '大牛', min: 5000, max: 10000, color: '#DC2626' },
  { name: '大佬', min: 10000, max: Infinity, color: '#7C3AED' },
]

const nextLevelName = computed(() => {
  const idx = levels.findIndex(l => l.name === pointsStore.level.name)
  return idx < levels.length - 1 ? levels[idx + 1].name : '已满级'
})

const betTaskTitle = computed(() => {
  const bet = pointsStore.todayBet
  if (!bet) return ''
  const task = tasksStore.tasks.find(t => t.id === bet.taskId)
  return task ? task.title : '任务已删除'
})

const betStatusClass = computed(() => {
  const status = pointsStore.todayBet?.status
  if (status === 'won') return 'tag-success'
  if (status === 'lost') return 'tag-danger'
  return 'tag-gold'
})

const betStatusText = computed(() => {
  const status = pointsStore.todayBet?.status
  if (status === 'won') return '押注成功'
  if (status === 'lost') return '押注失败'
  return ' 待结算'
})

const filteredTransactions = computed(() => {
  let txs = pointsStore.transactions
  if (currentFilter.value === 'today') {
    txs = txs.filter(t => t.date === todayStr())
  } else if (currentFilter.value === 'week') {
    const weekStart = dayjs().startOf('week').format('YYYY-MM-DD')
    txs = txs.filter(t => t.date >= weekStart)
  } else if (currentFilter.value === 'spend') {
    txs = txs.filter(t => t.amount < 0)
  }
  return txs
})

function canAfford(cost) {
  return pointsStore.totalPoints >= cost
}

function buyItem(item) {
  if (pointsStore.spendPoints(item.cost, `消费: ${item.name}`)) {
    purchaseToast.value = `<AppIcon name="party-popper" />  成功兑换「${item.name}」！`
    setTimeout(() => { purchaseToast.value = '' }, 3000)
  } else {
    purchaseToast.value = '积分不足'
    setTimeout(() => { purchaseToast.value = '' }, 3000)
  }
}

function settleBet(won) {
  pointsStore.settleBet(won)
  purchaseToast.value = won ? `<AppIcon name="party-popper" />  押注成功！获得${pointsStore.todayBet?.amount * 2 || 0}分！` : ' 押注失败，继续加油！'
  setTimeout(() => { purchaseToast.value = '' }, 3000)
}
</script>

<style scoped>
.points-page { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.section-card { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; }

.overview-card { background: linear-gradient(135deg, white, var(--color-primary-bg)); }
.overview-top { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
.overview-main { flex: 1; }
.overview-level { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.level-num { font-size: 24px; font-weight: 700; }
.level-name { font-size: 18px; font-weight: 600; }
.overview-points { display: flex; align-items: baseline; gap: 6px; margin-bottom: 12px; }
.points-big { font-size: 36px; font-weight: 700; color: var(--color-primary); }
.points-label { font-size: 14px; color: var(--color-text-secondary); }
.level-progress-bar { max-width: 400px; }
.progress-info { display: flex; justify-content: space-between; font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }

.overview-stats { display: flex; gap: 16px; }
.stat-box { text-align: center; padding: 12px 20px; border-radius: var(--radius-md); background: white; }
.stat-num { display: block; font-size: 22px; font-weight: 700; color: var(--color-primary); }
.stat-desc { font-size: 12px; color: var(--color-text-tertiary); }

.bet-card.active { border: 2px solid var(--color-gold); }
.bet-info { display: flex; flex-direction: column; gap: 8px; }
.bet-amount-display { display: flex; align-items: baseline; gap: 6px; }
.bet-amount-num { font-size: 28px; font-weight: 700; color: var(--color-gold-dark); }
.bet-amount-label { font-size: 14px; color: var(--color-text-secondary); }
.bet-task { font-size: 14px; }
.bet-task-label { color: var(--color-text-secondary); }
.bet-task-name { font-weight: 600; }
.bet-rule { font-size: 13px; color: var(--color-text-secondary); line-height: 1.8; }
.bet-actions { display: flex; gap: 8px; margin-top: 12px; }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.rules-list { display: flex; flex-direction: column; gap: 8px; }
.rule-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border-light); }
.rule-info { display: flex; flex-direction: column; }
.rule-name { font-size: 14px; font-weight: 600; }
.rule-desc { font-size: 12px; color: var(--color-text-tertiary); }
.rule-points { font-size: 16px; font-weight: 700; }
.rule-points.earn { color: var(--color-success); }

.bonus-section { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border-light); }
.bonus-section h4 { font-size: 14px; margin-bottom: 8px; }

.shop-list { display: flex; flex-direction: column; gap: 8px; }
.shop-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--color-border-light); }
.shop-info { display: flex; align-items: center; gap: 10px; }
.shop-icon { font-size: 20px; }
.shop-name { font-size: 14px; font-weight: 600; display: block; }
.shop-desc { font-size: 12px; color: var(--color-text-tertiary); }

.level-timeline { display: flex; gap: 8px; }
.level-timeline-item { flex: 1; text-align: center; position: relative; }
.level-timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 16px;
  right: -50%;
  width: 100%;
  height: 2px;
  background: var(--color-border);
  z-index: 0;
}
.level-timeline-item.passed:not(:last-child)::after { background: var(--color-success); }
.lv-marker {
  width: 32px; height: 32px;
  border-radius: 50%;
  margin: 0 auto 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  position: relative;
  z-index: 1;
  opacity: 0.3;
}
.level-timeline-item.current .lv-marker,
.level-timeline-item.passed .lv-marker { opacity: 1; }
.level-timeline-item.current .lv-marker { box-shadow: 0 0 0 4px var(--color-primary-bg); }
.lv-info { display: flex; flex-direction: column; }
.lv-name { font-size: 13px; font-weight: 600; }
.lv-range { font-size: 11px; color: var(--color-text-tertiary); }

.filter-tabs { display: flex; gap: 4px; }
.filter-btn { padding: 4px 10px; border: none; background: var(--color-bg-hover); border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; color: var(--color-text-secondary); }
.filter-btn.active { background: var(--color-primary); color: white; }

.transaction-list { max-height: 400px; overflow-y: auto; }
.transaction-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border-light); }
.tx-info { display: flex; flex-direction: column; }
.tx-reason { font-size: 14px; }
.tx-time { font-size: 12px; color: var(--color-text-tertiary); }
.tx-amount-area { text-align: right; }
.tx-amount { font-size: 16px; font-weight: 700; }
.tx-amount.earn { color: var(--color-success); }
.tx-amount.spend { color: var(--color-danger); }
.tx-balance { font-size: 12px; color: var(--color-text-tertiary); }

.copy-toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--color-text-primary); color: white;
  padding: 10px 20px; border-radius: var(--radius-md);
  font-size: 14px; box-shadow: var(--shadow-lg); z-index: 2000;
}

.empty-state { padding: 24px; text-align: center; }
.empty-state-icon { font-size: 48px; opacity: 0.5; margin-bottom: 8px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ===== 响应式：两栏布局在窄屏堆叠为单列 ===== */
@media (max-width: 760px) {
  .two-col { grid-template-columns: 1fr; }
}
</style>
