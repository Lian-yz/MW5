<template>
  <div class="finance-center-page">
    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab-pill">
        <button v-for="tab in tabs" :key="tab.id" class="tab-btn"
          :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          {{ tab.name }}
        </button>
      </div>
    </div>

    <!-- 总览 -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <!-- 统计卡片 -->
      <div class="finance-stats-grid">
        <div class="card stat-card">
          <div class="stat-icon" style="background:#3B82F615; color:#3B82F6;"><AppIcon name="wallet" :size="24" /></div>
          <div class="stat-body">
            <span class="stat-label">本月支出</span>
            <span class="stat-value">{{ financeStore.currency }}{{ formatMoney(financeStore.monthExpense) }}</span>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon" style="background:#10B98115; color:#10B981;"><AppIcon name="trending-up" :size="24" /></div>
          <div class="stat-body">
            <span class="stat-label">本月收入</span>
            <span class="stat-value">{{ financeStore.currency }}{{ formatMoney(financeStore.monthIncome) }}</span>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon" style="background:#8B5CF615; color:#8B5CF6;"><AppIcon name="hand-coins" :size="24" /></div>
          <div class="stat-body">
            <span class="stat-label">本月结余</span>
            <span class="stat-value" :class="{ 'stat-negative': financeStore.monthIncome - financeStore.monthExpense < 0 }">
              {{ financeStore.currency }}{{ formatMoney(financeStore.monthIncome - financeStore.monthExpense) }}
            </span>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon" style="background:#F59E0B15; color:#F59E0B;"><AppIcon name="hourglass" :size="24" /></div>
          <div class="stat-body">
            <span class="stat-label">累计结余</span>
            <span class="stat-value" :class="{ 'stat-negative': financeStore.balance < 0 }">
              {{ financeStore.currency }}{{ formatMoney(financeStore.balance) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 预算进度条 -->
      <div v-if="financeStore.monthlyBudget > 0" class="card section-card" style="margin-top:20px;">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="target" /> 本月预算</h2>
          <span class="text-xs text-tertiary">
            {{ formatMoney(financeStore.monthExpense) }} / {{ formatMoney(financeStore.monthlyBudget) }} 元
            <span v-if="financeStore.budgetRemaining >= 0" style="color:#10B981;">（剩余 {{ formatMoney(financeStore.budgetRemaining) }} 元）</span>
            <span v-else style="color:#EF4444;">（超支 {{ formatMoney(-financeStore.budgetRemaining) }} 元）</span>
          </span>
        </div>
        <div class="budget-bar-wrap">
          <div class="budget-bar-track">
            <div class="budget-bar-fill" :style="{
              width: Math.min(100, financeStore.budgetUsage) + '%',
              background: financeStore.budgetUsage >= 100 ? '#EF4444' : financeStore.budgetUsage >= 80 ? '#F59E0B' : '#3B82F6'
            }"></div>
          </div>
          <span class="budget-percent">{{ financeStore.budgetUsage }}%</span>
        </div>
      </div>

      <!-- 分类支出占比 -->
      <div class="overview-grid">
        <div class="card section-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="pie-chart" /> 分类支出占比</h2>
          </div>
          <div class="category-bars">
            <div v-for="cat in financeStore.categorySummary.filter(c => c.amount > 0)" :key="cat.id" class="category-bar-item">
              <div class="category-bar-info">
                <span class="category-bar-dot" :style="{ background: cat.color }"></span>
                <span class="category-bar-name">{{ cat.name }}</span>
                <span class="category-bar-amount">{{ financeStore.currency }}{{ formatMoney(cat.amount) }}</span>
                <span class="category-bar-pct">{{ getPercent(cat.amount) }}%</span>
              </div>
              <div class="category-bar-track">
                <div class="category-bar-fill" :style="{ width: getPercent(cat.amount) + '%', background: cat.color }"></div>
              </div>
            </div>
            <div v-if="financeStore.totalExpense === 0" class="empty-state" style="padding:40px 0;">
              <div class="empty-state-icon"><AppIcon name="receipt" :size="32" /></div>
              <p>暂无支出数据，切换到「财务库」记一笔吧</p>
            </div>
          </div>
        </div>

        <!-- 最近记录 -->
        <div class="card section-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="clock" /> 最近记录</h2>
            <span class="text-xs text-tertiary">最近 5 笔</span>
          </div>
          <div class="recent-list">
            <div v-for="e in financeStore.recentEntries(5)" :key="e.id" class="recent-item">
              <span class="recent-cat-dot" :style="{ background: financeStore.getCategoryColor(e) }"></span>
              <span class="recent-cat-name">{{ financeStore.getCategoryDisplayName(e) }}</span>
              <span class="recent-note">{{ e.note || '-' }}</span>
              <span class="recent-amount" :class="{ 'amount-income': e.type === 'income' }">
                {{ e.type === 'income' ? '+' : '-' }}{{ e.currency || 'CNY' }} {{ formatMoney(e.amount) }}
              </span>
              <span class="recent-date">{{ e.date }}</span>
            </div>
            <div v-if="financeStore.entries.length === 0" class="empty-state" style="padding:40px 0;">
              <div class="empty-state-icon"><AppIcon name="receipt" :size="32" /></div>
              <p>暂无记录</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 财务库 -->
    <div v-if="activeTab === 'library'" class="tab-content">
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="receipt" />  财务库</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="showConfigModal = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              财务库配置
            </button>
            <button class="header-btn" @click="triggerImport">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              导入
            </button>
            <input ref="fileInputRef" type="file" accept=".csv,.xlsx,.xls" style="display:none" @change="onFileSelected" />
            <div class="export-dropdown">
              <button class="header-btn" @click="toggleExportMenu">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出
              </button>
              <div v-if="showExportMenu" class="export-menu" @click.stop>
                <button @click="exportCSV"><AppIcon name="file-text" />  导出 CSV</button>
                <button @click="exportExcel"><AppIcon name="file-edit" />  导出 Excel</button>
              </div>
            </div>
            <button class="header-btn header-btn-primary" @click="openAddEntry">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加账目
            </button>
          </div>
        </div>

        <!-- 筛选栏 -->
        <div class="filter-bar">
          <div class="filter-search-row">
            <input class="input filter-search-full" v-model="searchQuery" placeholder="搜索备注、分类..." />
          </div>
          <div class="filter-selects-row">
            <GlassSelect
              v-model="filterType"
              select-class="input filter-select-col"
              :options="[
                { value: '', label: '全部类型' },
                { value: 'expense', label: '支出' },
                { value: 'income', label: '收入' }
              ]"
              placeholder="全部类型"
            />
            <GlassSelect
              v-model="filterCategory"
              select-class="input filter-select-col"
              :options="[
                { value: '', label: '全部分类' },
                ...financeStore.categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]"
              placeholder="全部分类"
            />
            <GlassSelect
              v-model="filterLedger"
              select-class="input filter-select-col"
              :options="[
                { value: '', label: '全部账本' },
                ...financeStore.ledgers.map(l => ({ value: l, label: l }))
              ]"
              placeholder="全部账本"
            />
            <GlassSelect
              v-model="financeStore.sortOrder"
              @change="onSortChange"
              select-class="input filter-select-col"
              :options="[
                { value: 'date', label: '按日期' },
                { value: 'amount', label: '按金额' },
                { value: 'category', label: '按分类' },
                { value: 'createdAt', label: '按添加时间' }
              ]"
              placeholder="按日期"
            />
            <div class="filter-select-col sort-controls">
              <button class="btn btn-ghost btn-sm sort-dir-btn" @click="toggleSortDir"
                :title="financeStore.sortDirection === 'desc' ? '降序 -> 升序' : '升序 -> 降序'">
                {{ financeStore.sortDirection === 'desc' ? '↓ 降序' : '↑ 升序' }}
              </button>
            </div>
          </div>
          <div class="filter-bottom-row">
            <button v-if="searchQuery || filterType || filterCategory || filterLedger" class="filter-clear" @click="clearFilters">✕ 清除筛选</button>
            <span class="filter-stats">显示 {{ filteredEntries.length }} / {{ financeStore.entries.length }} 条记录</span>
          </div>
        </div>

        <!-- 表格 -->
        <div class="paper-table-wrapper">
          <table class="paper-table">
            <thead>
              <tr>
                <th class="col-seq">ID</th>
                <th class="col-date">时间</th>
                <th class="col-ledger">账本</th>
                <th class="col-category">分类</th>
                <th class="col-type">类型</th>
                <th class="col-amount">金额</th>
                <th class="col-currency">币种</th>
                <th class="col-note">备注</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in filteredEntries" :key="e.id" class="paper-row">
                <td class="col-seq">{{ e.seq }}</td>
                <td class="col-date">{{ e.date }}</td>
                <td class="col-ledger">{{ e.ledger || '-' }}</td>
                <td class="col-category">
                  <span class="entry-category-badge" :style="{
                    background: financeStore.getCategoryColor(e) + '15',
                    color: financeStore.getCategoryColor(e),
                    borderColor: financeStore.getCategoryColor(e) + '40'
                  }">
                    <AppIcon :name="financeStore.getCategoryIcon(e)" :size="12" />
                    {{ financeStore.getCategoryDisplayName(e) }}
                  </span>
                </td>
                <td class="col-type">
                  <span class="entry-type-badge" :class="e.type === 'income' ? 'type-income' : 'type-expense'">
                    {{ e.type === 'income' ? '收入' : '支出' }}
                  </span>
                </td>
                <td class="col-amount">
                  <span class="entry-amount" :class="{ 'amount-income': e.type === 'income' }">
                    {{ e.type === 'income' ? '+' : '-' }}{{ formatMoney(e.amount) }}
                  </span>
                </td>
                <td class="col-currency">{{ e.currency || 'CNY' }}</td>
                <td class="col-note">{{ e.note || '-' }}</td>
                <td class="col-actions" @click.stop>
                  <button class="btn btn-sm btn-ghost" @click="openEditEntry(e)" title="编辑">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="deleteEntry(e)" title="删除">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredEntries.length === 0 && financeStore.entries.length > 0" class="empty-state" style="padding: 40px 0;">
            <div class="empty-state-icon"><AppIcon name="search" :size="32" /></div>
            <p>没有匹配的记录，尝试调整筛选条件</p>
          </div>
          <div v-if="financeStore.entries.length === 0" class="empty-state" style="padding: 40px 0;">
            <div class="empty-state-icon"><AppIcon name="receipt" :size="32" /></div>
            <p>还没有财务记录，点击右上角添加第一笔吧</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 信息库 -->
    <div v-if="activeTab === 'info'" class="tab-content">
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="database" />  信息库</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="showInfoConfigModal = true" title="自定义选项配置">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              信息库配置
            </button>
            <button class="header-btn" @click="openInfoAdd">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加{{ infoStore.typeName }}
            </button>
          </div>
        </div>

        <!-- 信息类型 Tab -->
        <div class="info-type-tabs">
          <button v-for="t in INFO_TYPES" :key="t.id" class="info-type-btn"
            :class="{ active: infoStore.activeType === t.id }" @click="switchInfoType(t.id)">
            <AppIcon :name="t.icon" :size="14" /> {{ t.name }}
          </button>
        </div>

        <!-- 筛选栏 -->
        <div class="filter-bar">
          <div class="filter-search-row">
            <input class="input filter-search-full" v-model="infoSearchQuery" placeholder="搜索名称、备注..." />
          </div>
          <div class="filter-bottom-row">
            <button v-if="infoSearchQuery" class="filter-clear" @click="infoSearchQuery = ''">✕ 清除筛选</button>
            <span class="filter-stats">显示 {{ filteredInfoItems.length }} / {{ infoStore.currentList.length }} 条</span>
          </div>
        </div>

        <!-- 表格：按类型动态列 -->
        <div class="paper-table-wrapper">
          <table class="paper-table">
            <thead>
              <tr>
                <template v-if="infoStore.activeType === 'subscription'">
                  <th>编号</th><th>订阅名称</th><th>会员等级</th><th>订阅分类</th><th>付费周期</th><th>订阅金额</th><th>开通日期</th><th>到期日期</th><th class="col-note">备注</th><th class="col-actions">操作</th>
                </template>
                <template v-else-if="infoStore.activeType === 'groupbuy'">
                  <th>编号</th><th>团购名称</th><th>商家名称</th><th>所属平台</th><th>可用时间</th><th>团购券码</th><th>金额</th><th>状态</th><th class="col-note">备注</th><th class="col-actions">操作</th>
                </template>
                <template v-else-if="infoStore.activeType === 'asset'">
                  <th>编号</th><th>名称</th><th>品牌</th><th>型号</th><th>购买日期</th><th>质保时间</th><th>价格(元)</th><th>购买渠道</th><th>状态</th><th>位置</th><th class="col-note">备注</th><th class="col-actions">操作</th>
                </template>
                <template v-else-if="infoStore.activeType === 'card'">
                  <th>编号</th><th>名称</th><th>类型</th><th>金额</th><th>办理日期</th><th>到期日期</th><th class="col-note">备注</th><th class="col-actions">操作</th>
                </template>
                <template v-else>
                  <th>编号</th><th>名称</th><th>运营商</th><th>套餐类型</th><th>月费(元)</th><th>流量</th><th>到期日</th><th class="col-note">备注</th><th class="col-actions">操作</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in infoStore.currentList" :key="item.id" class="paper-row">
                <template v-if="infoStore.activeType === 'subscription'">
                  <td>{{ item.seqLabel || item.seq }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.level || '-' }}</td>
                  <td>{{ item.category || '-' }}</td>
                  <td>{{ item.cycle || '-' }}</td>
                  <td>{{ item.amount != null && item.amount !== '' ? item.amount : '-' }}</td>
                  <td>{{ item.startDate || '-' }}</td>
                  <td>
                    <span class="entry-type-badge" :class="isInfoExpiring(item.expireDate) ? 'type-expense' : 'type-income'">{{ item.expireDate || '永久' }}</span>
                  </td>
                  <td class="col-note">{{ item.note || '-' }}</td>
                </template>
                <template v-else-if="infoStore.activeType === 'groupbuy'">
                  <td>{{ item.seqLabel || item.seq }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.merchant || '-' }}</td>
                  <td>{{ item.platform || '-' }}</td>
                  <td>{{ item.availableTime || '-' }}</td>
                  <td>{{ item.couponCode || '-' }}</td>
                  <td>{{ item.amount != null && item.amount !== '' ? item.amount : '-' }}</td>
                  <td>
                    <span class="entry-type-badge" :class="groupStatusClass(item.status)">{{ item.status || '未使用' }}</span>
                  </td>
                  <td class="col-note">{{ item.note || '-' }}</td>
                </template>
                <template v-else-if="infoStore.activeType === 'asset'">
                  <td>{{ item.seqLabel || item.seq }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.brand || '-' }}</td>
                  <td>{{ item.model || '-' }}</td>
                  <td>{{ item.purchaseDate || '-' }}</td>
                  <td>{{ item.warrantyDate || '-' }}</td>
                  <td>{{ item.price || '-' }}</td>
                  <td>{{ item.channel || '-' }}</td>
                  <td>
                    <span class="entry-type-badge" :style="assetStatusStyle(item.status)">{{ item.status || '-' }}</span>
                  </td>
                  <td>{{ item.location || '-' }}</td>
                  <td class="col-note">{{ item.note || '-' }}</td>
                </template>
                <template v-else-if="infoStore.activeType === 'card'">
                  <td>{{ item.seqLabel || item.seq }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.type || '-' }}</td>
                  <td>{{ item.amount != null && item.amount !== '' ? item.amount : '-' }}</td>
                  <td>{{ item.issueDate || '-' }}</td>
                  <td>
                    <span class="entry-type-badge" :class="isInfoExpired(item.expireDate) ? 'type-expense' : 'type-income'">{{ item.permanent ? '永久有效' : (item.expireDate || '-') }}</span>
                  </td>
                  <td class="col-note">{{ item.note || '-' }}</td>
                </template>
                <template v-else>
                  <td>{{ item.seqLabel || item.seq }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ item.carrier || '-' }}</td>
                  <td>{{ item.planType || '-' }}</td>
                  <td>{{ item.price || '-' }}</td>
                  <td>{{ item.data || '-' }}</td>
                  <td>{{ item.expireDate || '-' }}</td>
                  <td class="col-note">{{ item.note || '-' }}</td>
                </template>
                <td class="col-actions" @click.stop>
                  <button class="btn btn-sm btn-ghost" @click="openInfoEdit(item)" title="编辑">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="deleteInfoItem(item)" title="删除">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="infoStore.currentList.length === 0" class="empty-state" style="padding: 40px 0;">
            <div class="empty-state-icon"><AppIcon name="database" :size="32" /></div>
            <p>还没有{{ infoStore.typeName }}记录，点击右上角添加第一条吧</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 信息库添加/编辑弹窗 -->
    <div v-if="showInfoModal" class="modal-overlay" @click.self="closeInfoModal">
      <div class="modal-content" style="max-width: 560px;">
        <div style="padding: 24px;">
          <div class="modal-header">
            <h3 class="modal-title">{{ editingInfoItem ? '编辑' : '添加' }}{{ infoStore.typeName }}</h3>
            <button class="soft-btn-close modal-close-inline" @click="closeInfoModal" title="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="entry-form" style="margin-top:16px;">
            <template v-if="infoStore.activeType === 'subscription'">
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">订阅名称 <span style="color:#EF4444;">*</span></label>
                  <input class="input" v-model="infoForm.name" placeholder="如：网盘会员" />
                </div>
                <div class="form-row" style="width:150px;">
                  <label class="form-label">会员等级</label>
                  <GlassSelect
                    v-model="infoForm.level"
                    select-class="input"
                    :options="[
                      { value: '', label: '未选择' },
                      ...infoStore.optionList('subLevel').map(opt => ({ value: opt.name, label: opt.name }))
                    ]"
                    placeholder="未选择"
                  />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">订阅分类</label>
                  <GlassSelect
                    v-model="infoForm.category"
                    select-class="input"
                    :options="infoStore.optionList('subCategory').map(opt => ({ value: opt.name, label: opt.name }))"
                    placeholder="选择分类"
                  />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">付费周期</label>
                  <GlassSelect
                    v-model="infoForm.cycle"
                    select-class="input"
                    :options="infoStore.optionList('subCycle').map(opt => ({ value: opt.name, label: opt.name }))"
                    placeholder="选择周期"
                  />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="width:150px;">
                  <label class="form-label">订阅金额(元)</label>
                  <input class="input" type="number" step="0.01" min="0" v-model.number="infoForm.amount" placeholder="0" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">开通日期</label>
                  <input class="input" type="date" v-model="infoForm.startDate" />
                </div>
              </div>
              <div class="form-row">
                <label class="form-label">到期日期</label>
                <input class="input" type="date" v-model="infoForm.expireDate" />
              </div>
            </template>
            <template v-else-if="infoStore.activeType === 'groupbuy'">
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">团购名称 <span style="color:#EF4444;">*</span></label>
                  <input class="input" v-model="infoForm.name" placeholder="如：火锅双人餐" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">商家名称</label>
                  <input class="input" v-model="infoForm.merchant" placeholder="如：海底捞" />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">所属平台</label>
                  <GlassSelect
                    v-model="infoForm.platform"
                    select-class="input"
                    :options="infoStore.optionList('groupPlatform').map(opt => ({ value: opt.name, label: opt.name }))"
                    placeholder="选择平台"
                  />
                </div>
                <div class="form-row" style="width:150px;">
                  <label class="form-label">金额(元)</label>
                  <input class="input" type="number" step="0.01" min="0" v-model.number="infoForm.amount" placeholder="0" />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">可用时间</label>
                  <input class="input" v-model="infoForm.availableTime" placeholder="如：2026-08-01 ~ 2026-09-30" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">团购券码</label>
                  <input class="input" v-model="infoForm.couponCode" placeholder="券码/核销码" />
                </div>
              </div>
              <div class="form-row">
                <label class="form-label">状态</label>
                <GlassSelect
                  v-model="infoForm.status"
                  select-class="input"
                  :options="infoStore.optionList('groupStatus').map(opt => ({ value: opt.name, label: opt.name }))"
                  placeholder="选择状态"
                />
              </div>
            </template>
            <template v-else-if="infoStore.activeType === 'asset'">
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">名称 <span style="color:#EF4444;">*</span></label>
                  <input class="input" v-model="infoForm.name" placeholder="如：笔记本电脑" />
                </div>
                <div class="form-row" style="width:120px;">
                  <label class="form-label">价格(元)</label>
                  <input class="input" type="number" step="0.01" min="0" v-model.number="infoForm.price" placeholder="0" />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">品牌</label>
                  <input class="input" v-model="infoForm.brand" placeholder="如：联想" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">型号</label>
                  <input class="input" v-model="infoForm.model" placeholder="如：小新 Pro 16" />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">购买日期</label>
                  <input class="input" type="date" v-model="infoForm.purchaseDate" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">质保时间</label>
                  <input class="input" type="date" v-model="infoForm.warrantyDate" />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">购买渠道</label>
                  <GlassSelect
                    v-model="infoForm.channel"
                    select-class="input"
                    :options="infoStore.optionList('assetChannel').map(opt => ({ value: opt.name, label: opt.name }))"
                    placeholder="选择渠道"
                  />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">资产状态</label>
                  <GlassSelect
                    v-model="infoForm.status"
                    select-class="input"
                    :options="infoStore.optionList('assetStatus').map(opt => ({ value: opt.name, label: opt.name }))"
                    placeholder="选择状态"
                  />
                </div>
              </div>
              <div class="form-row">
                <label class="form-label">位置</label>
                <input class="input" v-model="infoForm.location" placeholder="如：宿舍" />
              </div>
            </template>
            <template v-else-if="infoStore.activeType === 'card'">
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">名称 <span style="color:#EF4444;">*</span></label>
                  <input class="input" v-model="infoForm.name" placeholder="如：健身卡" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">类型</label>
                  <GlassSelect
                    v-model="infoForm.type"
                    select-class="input"
                    :options="infoStore.optionList('cardType').map(opt => ({ value: opt.name, label: opt.name }))"
                    placeholder="选择类型"
                  />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="width:150px;">
                  <label class="form-label">金额(元)</label>
                  <input class="input" type="number" step="0.01" min="0" v-model.number="infoForm.amount" placeholder="0" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">办理日期</label>
                  <input class="input" type="date" v-model="infoForm.issueDate" />
                </div>
              </div>
              <div class="form-row">
                <label class="form-label">到期日期</label>
                <div style="display:flex; align-items:center; gap:12px;">
                  <input class="input" type="date" v-model="infoForm.expireDate" :disabled="infoForm.permanent" :style="infoForm.permanent ? 'opacity:0.4' : ''" />
                  <label class="checkbox-inline">
                    <input type="checkbox" v-model="infoForm.permanent" /> 永久有效
                  </label>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">名称 <span style="color:#EF4444;">*</span></label>
                  <input class="input" v-model="infoForm.name" placeholder="如：主卡套餐" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">运营商</label>
                  <GlassSelect
                    v-model="infoForm.carrier"
                    select-class="input"
                    :options="[
                      { value: '移动', label: '中国移动' },
                      { value: '联通', label: '中国联通' },
                      { value: '电信', label: '中国电信' },
                      { value: '其他', label: '其他' }
                    ]"
                    placeholder="选择运营商"
                  />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">套餐类型</label>
                  <input class="input" v-model="infoForm.planType" placeholder="如：校园卡/流量卡" />
                </div>
                <div class="form-row" style="width:120px;">
                  <label class="form-label">月费(元)</label>
                  <input class="input" type="number" step="0.01" min="0" v-model.number="infoForm.price" placeholder="0" />
                </div>
              </div>
              <div class="form-row-inline">
                <div class="form-row" style="flex:1;">
                  <label class="form-label">流量</label>
                  <input class="input" v-model="infoForm.data" placeholder="如：30G" />
                </div>
                <div class="form-row" style="flex:1;">
                  <label class="form-label">到期日</label>
                  <input class="input" type="date" v-model="infoForm.expireDate" />
                </div>
              </div>
            </template>

            <!-- 备注（所有类型通用） -->
            <div class="form-row">
              <label class="form-label">备注</label>
              <textarea class="input" v-model="infoForm.note" rows="2" placeholder="可选..."></textarea>
            </div>

            <div class="form-actions">
              <button v-if="editingInfoItem" class="btn btn-ghost" @click="deleteInfoFromModal" style="color:#EF4444;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                删除
              </button>
              <div style="flex:1;"></div>
              <button class="btn btn-ghost" @click="closeInfoModal">取消</button>
              <button class="btn btn-primary" @click="saveInfoItem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 信息库配置弹窗 -->
    <div v-if="showInfoConfigModal" class="modal-overlay info-config-overlay" @click.self="showInfoConfigModal = false">
      <div class="modal-content config-modal">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title"><AppIcon name="settings" :size="18" /> 信息库配置</h3>
            <button class="soft-btn-close modal-close-inline" @click="showInfoConfigModal = false" title="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p style="font-size:12px; color:var(--color-text-tertiary); margin:8px 0 16px;">
            自定义信息库各类型的选项列表。预置项可修改名称，自定义项可删除/排序，修改即时生效。
          </p>
          <div class="cfg-grid">
            <!-- 订阅配置组 -->
            <div class="cfg-group" v-if="infoStore.activeType === 'subscription'">
              <h4 class="cfg-group-title"><AppIcon name="subscriptions" :size="16" /> 软件订阅选项</h4>
              <div class="cfg-grid-inner">
                <div class="cfg-block">
                  <div class="cfg-block-head">
                    <h5 class="cfg-block-title">会员等级</h5>
                    <button class="soft-btn btn-sm" @click="addInfoConfigItem('subLevel')">+ 添加</button>
                  </div>
                  <div class="cfg-list">
                    <div v-for="(opt, i) in infoStore.optionList('subLevel')" :key="opt.id" class="cfg-item">
                      <input class="input cfg-name" :value="opt.name" @change="updateInfoConfigName('subLevel', opt.id, $event.target.value)" placeholder="名称" />
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('subLevel', i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('subLevel', i, i + 1)" :disabled="i === infoStore.optionList('subLevel').length - 1" title="下移">↓</button>
                      <button class="soft-btn-icon danger" @click="deleteInfoConfigItem('subLevel', opt.id)" :disabled="opt.isPreset && infoStore.optionList('subLevel').filter(o => o.isPreset).length <= 1" title="删除">✕</button>
                    </div>
                  </div>
                </div>
                <div class="cfg-block">
                  <div class="cfg-block-head">
                    <h5 class="cfg-block-title">订阅分类</h5>
                    <button class="soft-btn btn-sm" @click="addInfoConfigItem('subCategory')">+ 添加</button>
                  </div>
                  <div class="cfg-list">
                    <div v-for="(opt, i) in infoStore.optionList('subCategory')" :key="opt.id" class="cfg-item">
                      <input class="input cfg-name" :value="opt.name" @change="updateInfoConfigName('subCategory', opt.id, $event.target.value)" placeholder="名称" />
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('subCategory', i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('subCategory', i, i + 1)" :disabled="i === infoStore.optionList('subCategory').length - 1" title="下移">↓</button>
                      <button class="soft-btn-icon danger" @click="deleteInfoConfigItem('subCategory', opt.id)" :disabled="opt.isPreset && infoStore.optionList('subCategory').filter(o => o.isPreset).length <= 1" title="删除">✕</button>
                    </div>
                  </div>
                </div>
                <div class="cfg-block">
                  <div class="cfg-block-head">
                    <h5 class="cfg-block-title">付费周期</h5>
                    <button class="soft-btn btn-sm" @click="addInfoConfigItem('subCycle')">+ 添加</button>
                  </div>
                  <div class="cfg-list">
                    <div v-for="(opt, i) in infoStore.optionList('subCycle')" :key="opt.id" class="cfg-item">
                      <input class="input cfg-name" :value="opt.name" @change="updateInfoConfigName('subCycle', opt.id, $event.target.value)" placeholder="名称" />
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('subCycle', i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('subCycle', i, i + 1)" :disabled="i === infoStore.optionList('subCycle').length - 1" title="下移">↓</button>
                      <button class="soft-btn-icon danger" @click="deleteInfoConfigItem('subCycle', opt.id)" :disabled="opt.isPreset && infoStore.optionList('subCycle').filter(o => o.isPreset).length <= 1" title="删除">✕</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 团购配置组 -->
            <div class="cfg-group" v-if="infoStore.activeType === 'groupbuy'">
              <h4 class="cfg-group-title"><AppIcon name="users" :size="16" /> 团购选项</h4>
              <div class="cfg-grid-inner">
                <div class="cfg-block">
                  <div class="cfg-block-head">
                    <h5 class="cfg-block-title">所属平台</h5>
                    <button class="soft-btn btn-sm" @click="addInfoConfigItem('groupPlatform')">+ 添加</button>
                  </div>
                  <div class="cfg-list">
                    <div v-for="(opt, i) in infoStore.optionList('groupPlatform')" :key="opt.id" class="cfg-item">
                      <input class="input cfg-name" :value="opt.name" @change="updateInfoConfigName('groupPlatform', opt.id, $event.target.value)" placeholder="名称" />
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('groupPlatform', i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('groupPlatform', i, i + 1)" :disabled="i === infoStore.optionList('groupPlatform').length - 1" title="下移">↓</button>
                      <button class="soft-btn-icon danger" @click="deleteInfoConfigItem('groupPlatform', opt.id)" :disabled="opt.isPreset && infoStore.optionList('groupPlatform').filter(o => o.isPreset).length <= 1" title="删除">✕</button>
                    </div>
                  </div>
                </div>
                <div class="cfg-block">
                  <div class="cfg-block-head">
                    <h5 class="cfg-block-title">团购状态</h5>
                    <button class="soft-btn btn-sm" @click="addInfoConfigItem('groupStatus')">+ 添加</button>
                  </div>
                  <div class="cfg-list">
                    <div v-for="(opt, i) in infoStore.optionList('groupStatus')" :key="opt.id" class="cfg-item">
                      <input class="input cfg-name" :value="opt.name" @change="updateInfoConfigName('groupStatus', opt.id, $event.target.value)" placeholder="名称" />
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('groupStatus', i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('groupStatus', i, i + 1)" :disabled="i === infoStore.optionList('groupStatus').length - 1" title="下移">↓</button>
                      <button class="soft-btn-icon danger" @click="deleteInfoConfigItem('groupStatus', opt.id)" :disabled="opt.isPreset && infoStore.optionList('groupStatus').filter(o => o.isPreset).length <= 1" title="删除">✕</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 卡证配置组 -->
            <div class="cfg-group" v-if="infoStore.activeType === 'card'">
              <h4 class="cfg-group-title"><AppIcon name="credit-card" :size="16" /> 卡证选项</h4>
              <div class="cfg-block">
                <div class="cfg-block-head">
                  <h5 class="cfg-block-title">卡证类型</h5>
                  <button class="soft-btn btn-sm" @click="addInfoConfigItem('cardType')">+ 添加</button>
                </div>
                <div class="cfg-list">
                  <div v-for="(opt, i) in infoStore.optionList('cardType')" :key="opt.id" class="cfg-item">
                    <input class="input cfg-name" :value="opt.name" @change="updateInfoConfigName('cardType', opt.id, $event.target.value)" placeholder="名称" />
                    <button class="soft-btn-icon" @click="moveInfoConfigItem('cardType', i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                    <button class="soft-btn-icon" @click="moveInfoConfigItem('cardType', i, i + 1)" :disabled="i === infoStore.optionList('cardType').length - 1" title="下移">↓</button>
                    <button class="soft-btn-icon danger" @click="deleteInfoConfigItem('cardType', opt.id)" :disabled="opt.isPreset && infoStore.optionList('cardType').filter(o => o.isPreset).length <= 1" title="删除">✕</button>
                  </div>
                </div>
              </div>
            </div>
            <!-- 资产配置组 -->
            <div class="cfg-group" v-if="infoStore.activeType === 'asset'">
              <h4 class="cfg-group-title"><AppIcon name="package" :size="16" /> 资产选项</h4>
              <div class="cfg-grid-inner">
                <div class="cfg-block">
                  <div class="cfg-block-head">
                    <h5 class="cfg-block-title">购买渠道</h5>
                    <button class="soft-btn btn-sm" @click="addInfoConfigItem('assetChannel')">+ 添加</button>
                  </div>
                  <div class="cfg-list">
                    <div v-for="(opt, i) in infoStore.optionList('assetChannel')" :key="opt.id" class="cfg-item">
                      <input class="input cfg-name" :value="opt.name" @change="updateInfoConfigName('assetChannel', opt.id, $event.target.value)" placeholder="名称" />
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('assetChannel', i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('assetChannel', i, i + 1)" :disabled="i === infoStore.optionList('assetChannel').length - 1" title="下移">↓</button>
                      <button class="soft-btn-icon danger" @click="deleteInfoConfigItem('assetChannel', opt.id)" :disabled="opt.isPreset && infoStore.optionList('assetChannel').filter(o => o.isPreset).length <= 1" title="删除">✕</button>
                    </div>
                  </div>
                </div>
                <div class="cfg-block">
                  <div class="cfg-block-head">
                    <h5 class="cfg-block-title">资产状态</h5>
                    <button class="soft-btn btn-sm" @click="addInfoConfigItem('assetStatus')">+ 添加</button>
                  </div>
                  <div class="cfg-list">
                    <div v-for="(opt, i) in infoStore.optionList('assetStatus')" :key="opt.id" class="cfg-item">
                      <input type="color" class="cfg-color-picker" :value="opt.color || '#6B7280'" @input="updateInfoConfigColor('assetStatus', opt.id, $event.target.value)" title="状态颜色" />
                      <input class="input cfg-name" :value="opt.name" @change="updateInfoConfigName('assetStatus', opt.id, $event.target.value)" placeholder="名称" />
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('assetStatus', i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                      <button class="soft-btn-icon" @click="moveInfoConfigItem('assetStatus', i, i + 1)" :disabled="i === infoStore.optionList('assetStatus').length - 1" title="下移">↓</button>
                      <button class="soft-btn-icon danger" @click="deleteInfoConfigItem('assetStatus', opt.id)" :disabled="opt.isPreset && infoStore.optionList('assetStatus').filter(o => o.isPreset).length <= 1" title="删除">✕</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 手机套餐无自定义选项 -->
            <div v-if="infoStore.activeType === 'plan'" class="cfg-empty" style="padding:40px 0; text-align:center;">
              当前类型无可自定义选项
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <div v-if="showEntryModal" class="modal-overlay" @click.self="closeEntryModal">
      <div class="modal-content" style="max-width: 500px;">
        <div style="padding: 24px;">
          <div class="modal-header">
            <h3 class="modal-title">{{ editingEntry ? '编辑账目' : '添加账目' }}</h3>
            <button class="soft-btn-close modal-close-inline" @click="closeEntryModal" title="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="entry-form">
            <!-- 类型切换 -->
            <div class="form-row">
              <div class="form-type-switch">
                <button class="type-switch-btn" :class="{ active: entryForm.type === 'expense' }"
                  @click="entryForm.type = 'expense'">支出</button>
                <button class="type-switch-btn" :class="{ active: entryForm.type === 'income' }"
                  @click="entryForm.type = 'income'">收入</button>
              </div>
            </div>

            <!-- 金额 + 币种 -->
            <div class="form-row-inline">
              <div class="form-row" style="flex:1;">
                <label class="form-label">金额 <span style="color:#EF4444;">*</span></label>
                <div class="amount-input-wrap">
                  <input class="input" type="number" step="0.01" min="0" v-model.number="entryForm.amount"
                    placeholder="0.00" @keydown.enter="saveEntry" />
                </div>
              </div>
              <div class="form-row" style="width:120px;">
                <label class="form-label">币种</label>
                <GlassSelect
                  v-model="entryForm.currency"
                  select-class="input"
                  :options="financeStore.currencies.map(c => ({ value: c, label: c }))"
                  placeholder="选择币种"
                />
              </div>
            </div>

            <!-- 分类 + 二级分类 -->
            <div class="form-row-inline">
              <div class="form-row" style="flex:1;">
                <label class="form-label">分类</label>
                <GlassSelect
                  v-model="entryForm.category"
                  @change="onFormCategoryChange"
                  select-class="input"
                  :options="financeStore.categories.map(cat => ({ value: cat.id, label: cat.name }))"
                  placeholder="选择分类"
                />
              </div>
              <div class="form-row" style="flex:1;">
                <label class="form-label">二级分类</label>
                <GlassSelect
                  v-model="entryForm.subCategory"
                  :disabled="!currentSubCategories.length"
                  select-class="input"
                  :options="[
                    { value: '', label: '无' },
                    ...currentSubCategories.map(sub => ({ value: sub.id, label: sub.name }))
                  ]"
                  placeholder="无"
                />
              </div>
            </div>

            <!-- 账本 + 日期 -->
            <div class="form-row-inline">
              <div class="form-row" style="flex:1;">
                <label class="form-label">账本</label>
                <GlassSelect
                  v-model="entryForm.ledger"
                  select-class="input"
                  :options="financeStore.ledgers.map(l => ({ value: l, label: l }))"
                  placeholder="选择账本"
                />
              </div>
              <div class="form-row" style="flex:1;">
                <label class="form-label">日期</label>
                <input class="input" type="date" v-model="entryForm.date" />
              </div>
            </div>

            <!-- 备注 -->
            <div class="form-row">
              <label class="form-label">备注</label>
              <textarea class="input" v-model="entryForm.note" rows="2" placeholder="可选，记录消费详情..."></textarea>
            </div>

            <!-- 操作按钮 -->
            <div class="form-actions">
              <button v-if="editingEntry" class="btn btn-ghost" @click="deleteEntryFromModal" style="color:#EF4444;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                删除
              </button>
              <div style="flex:1;"></div>
              <button class="btn btn-ghost" @click="closeEntryModal">取消</button>
              <button class="btn btn-primary" @click="saveEntry">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 配置弹窗 -->
    <div v-if="showConfigModal" class="modal-overlay" @click.self="showConfigModal = false">
      <div class="modal-content" style="max-width: 620px;">
        <div style="padding: 24px;">
          <div class="modal-header">
            <h3 class="modal-title"><AppIcon name="settings" :size="18" /> 财务库配置</h3>
            <button class="soft-btn-close modal-close-inline" @click="showConfigModal = false" title="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- 预算设置 -->
          <div class="config-section">
            <h4 class="config-section-title"><AppIcon name="target" :size="16" /> 月度预算</h4>
            <div class="config-row">
              <input class="input" type="number" min="0" step="100" v-model.number="budgetInput" placeholder="0 = 不设限" style="width:160px;" />
              <span class="config-hint">元/月（设为 0 则不显示预算条）</span>
            </div>
          </div>

          <!-- 货币符号 -->
          <div class="config-section">
            <h4 class="config-section-title"><AppIcon name="coins" :size="16" /> 货币符号</h4>
            <div class="config-row">
              <input class="input" type="text" v-model="currencyInput" maxlength="3" style="width:80px;" />
              <span class="config-hint">如 ¥、$、€ 等（用于总览统计展示）</span>
            </div>
          </div>

          <!-- 账本管理 -->
          <div class="config-section">
            <h4 class="config-section-title"><AppIcon name="book" :size="16" /> 账本管理</h4>
            <div class="category-list-config">
              <div v-for="l in financeStore.ledgers" :key="l" class="category-config-item">
                <span class="cat-name">{{ l }}</span>
                <button class="btn btn-sm btn-ghost" @click="removeLedger(l)" title="删除账本">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <div class="add-category-row">
              <input class="input input-sm" v-model="newLedgerName" placeholder="账本名称" style="width:140px;" />
              <button class="btn btn-sm btn-primary" @click="addLedger">添加账本</button>
            </div>
          </div>

          <!-- 币种管理 -->
          <div class="config-section">
            <h4 class="config-section-title"><AppIcon name="coins" :size="16" /> 币种管理</h4>
            <div class="category-list-config">
              <div v-for="c in financeStore.currencies" :key="c" class="category-config-item">
                <span class="cat-name">{{ c }}</span>
                <button class="btn btn-sm btn-ghost" @click="removeCurrency(c)" title="删除币种">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <div class="add-category-row">
              <input class="input input-sm" v-model="newCurrencyCode" placeholder="如 HKD" style="width:100px;" />
              <button class="btn btn-sm btn-primary" @click="addCurrency">添加币种</button>
            </div>
          </div>

          <!-- 分类管理 -->
          <div class="config-section">
            <h4 class="config-section-title"><AppIcon name="tag" :size="16" /> 分类管理</h4>
            <!-- 一级分类列表 -->
            <div v-for="cat in financeStore.categories" :key="cat.id" class="category-tree-item">
              <div class="category-config-item category-tree-l1">
                <span class="cat-color-dot" :style="{ background: cat.color }"></span>
                <span class="cat-name">{{ cat.name }}</span>
                <input class="input input-sm" type="color" v-model="cat.color" @change="onCatColorChange(cat)" style="width:40px; height:28px; padding:2px; border-radius:4px;" />
                <button class="btn btn-sm btn-ghost" @click="removeCategory(cat.id)" title="删除分类" :disabled="cat.id === 'other'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
              <!-- 二级分类列表 -->
              <div v-if="cat.children && cat.children.length > 0" class="category-children">
                <div v-for="sub in cat.children" :key="sub.id" class="category-config-item category-tree-l2">
                  <span class="cat-color-dot" :style="{ background: sub.color }"></span>
                  <span class="cat-name">{{ sub.name }}</span>
                  <input class="input input-sm" type="color" v-model="sub.color" @change="onSubCatColorChange(cat, sub)" style="width:40px; height:28px; padding:2px; border-radius:4px;" />
                  <button class="btn btn-sm btn-ghost" @click="removeSubCategory(cat.id, sub.id)" title="删除二级分类">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              <!-- 添加二级分类 -->
              <div class="add-sub-category-row">
                <input class="input input-sm" v-model="subCategoryInput[cat.id]" placeholder="二级分类名称" style="width:120px;" />
                <input class="input input-sm" type="color" v-model="subColorInput[cat.id]" style="width:40px; height:28px; padding:2px; border-radius:4px;" />
                <button class="btn btn-sm btn-ghost" @click="addSubCategory(cat.id)" title="添加二级分类">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  添加
                </button>
              </div>
            </div>
            <!-- 添加一级分类 -->
            <div class="add-category-row" style="margin-top:12px;">
              <input class="input input-sm" v-model="newCategory.name" placeholder="一级分类名称" style="width:120px;" />
              <input class="input input-sm" type="color" v-model="newCategory.color" style="width:40px; height:28px; padding:2px; border-radius:4px;" />
              <button class="btn btn-sm btn-primary" @click="addCategory">添加分类</button>
            </div>
          </div>

          <div class="form-actions" style="margin-top:20px;">
            <div style="flex:1;"></div>
            <button class="btn btn-primary" @click="saveConfig">保存配置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入结果弹窗 -->
    <div v-if="importResult" class="modal-overlay" @click.self="importResult = null">
      <div class="modal-content" style="max-width: 360px;">
        <div style="padding: 24px; text-align:center;">
          <div style="font-size:48px; margin-bottom:12px;">{{ importResult.added > 0 ? '✅' : '⚠️' }}</div>
          <h3 class="modal-title">导入完成</h3>
          <p style="margin-top:12px;">成功导入 {{ importResult.added }} 条记录</p>
          <p v-if="importResult.skipped > 0" style="color:var(--color-text-tertiary); margin-top:4px;">跳过 {{ importResult.skipped }} 条无效行</p>
          <p v-if="importResult.error" style="color:#EF4444; margin-top:4px; font-size:12px;">{{ importResult.error }}</p>
          <button class="btn btn-primary" style="margin-top:20px;" @click="importResult = null">确定</button>
        </div>
      </div>
    </div>

    <!-- 批量编辑弹窗 -->
    <div v-if="showBatchModal" class="modal-overlay batch-modal-overlay" @click.self="showBatchModal = false">
      <div class="modal-content batch-modal-content">
        <div style="padding: 20px 24px;">
          <div class="modal-header">
            <h3 class="modal-title">批量编辑 - 共 {{ batchEntries.length }} 条记录</h3>
            <button class="soft-btn-close modal-close-inline" @click="showBatchModal = false" title="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- 批量设置区 -->
          <div class="batch-set-area">
            <div class="batch-set-row">
              <label class="batch-set-label">选择字段</label>
              <GlassSelect
                v-model="batchField"
                select-class="input input-sm"
                size="sm"
                style="width:100px;"
                :options="batchFieldOptions.map(opt => ({ value: opt.value, label: opt.label }))"
                placeholder="选择字段"
              />
              <template v-if="batchField === 'type'">
                <GlassSelect
                  v-model="batchValue"
                  select-class="input input-sm"
                  size="sm"
                  style="width:100px;"
                  :options="[
                    { value: '', label: '选择' },
                    { value: 'expense', label: '支出' },
                    { value: 'income', label: '收入' }
                  ]"
                  placeholder="选择"
                />
              </template>
              <template v-else-if="batchField === 'category'">
                <GlassSelect
                  v-model="batchValue"
                  select-class="input input-sm"
                  size="sm"
                  style="width:120px;"
                  :options="[
                    { value: '', label: '选择分类' },
                    ...financeStore.categories.map(cat => ({ value: cat.id, label: cat.name }))
                  ]"
                  placeholder="选择分类"
                />
                <GlassSelect
                  v-model="batchValueSub"
                  :disabled="!batchSubCategories.length"
                  select-class="input input-sm"
                  size="sm"
                  style="width:120px;"
                  :options="[
                    { value: '', label: '无' },
                    ...batchSubCategories.map(sub => ({ value: sub.id, label: sub.name }))
                  ]"
                  placeholder="无"
                />
              </template>
              <template v-else-if="batchField === 'ledger'">
                <GlassSelect
                  v-model="batchValue"
                  select-class="input input-sm"
                  size="sm"
                  style="width:120px;"
                  :options="[
                    { value: '', label: '选择账本' },
                    ...financeStore.ledgers.map(l => ({ value: l, label: l }))
                  ]"
                  placeholder="选择账本"
                />
              </template>
              <template v-else-if="batchField === 'currency'">
                <GlassSelect
                  v-model="batchValue"
                  select-class="input input-sm"
                  size="sm"
                  style="width:100px;"
                  :options="[
                    { value: '', label: '选择币种' },
                    ...financeStore.currencies.map(c => ({ value: c, label: c }))
                  ]"
                  placeholder="选择币种"
                />
              </template>
              <template v-else>
                <input class="input input-sm" v-model="batchValue" style="width:140px;" :type="batchField === 'date' ? 'date' : 'text'" />
              </template>
              <button class="btn btn-sm btn-primary" @click="applyBatchField">应用</button>
            </div>
            <p class="batch-set-hint">勾选要修改的行，选择字段和值，点击「应用」批量设置。{{ batchSelected.size }} 行已选中。</p>
          </div>

          <!-- 批量编辑表格 -->
          <div class="batch-table-wrapper">
            <table class="paper-table batch-table">
              <thead>
                <tr>
                  <th style="width:36px;"><input type="checkbox" v-model="batchAllSelected" /></th>
                  <th>类型</th>
                  <th>金额</th>
                  <th>币种</th>
                  <th>分类</th>
                  <th>二级</th>
                  <th>账本</th>
                  <th>日期</th>
                  <th>备注</th>
                  <th style="width:40px;">删</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(e, i) in batchEntries" :key="i" class="paper-row"
                  :class="{ 'batch-row-selected': batchSelected.has(i) }">
                  <td style="text-align:center;"><input type="checkbox" :checked="batchSelected.has(i)"
                    @change="toggleBatchRow(i)" /></td>
                  <td>
                    <GlassSelect
                      v-model="e.type"
                      select-class="input input-sm batch-input"
                      size="sm"
                      :options="[
                        { value: 'expense', label: '支出' },
                        { value: 'income', label: '收入' }
                      ]"
                      placeholder="选择"
                    />
                  </td>
                  <td>
                    <input class="input input-sm batch-input" type="number" step="0.01" v-model.number="e.amount" style="width:80px;" />
                  </td>
                  <td>
                    <GlassSelect
                      v-model="e.currency"
                      select-class="input input-sm batch-input"
                      size="sm"
                      style="width:70px;"
                      :options="financeStore.currencies.map(c => ({ value: c, label: c }))"
                      placeholder="选择"
                    />
                  </td>
                  <td>
                    <GlassSelect
                      v-model="e.category"
                      select-class="input input-sm batch-input"
                      size="sm"
                      style="width:90px;"
                      :options="financeStore.categories.map(cat => ({ value: cat.id, label: cat.name }))"
                      placeholder="选择"
                    />
                  </td>
                  <td>
                    <GlassSelect
                      v-model="e.subCategory"
                      :disabled="!(financeStore.categories.find(c => c.id === e.category)?.children?.length)"
                      select-class="input input-sm batch-input"
                      size="sm"
                      style="width:80px;"
                      :options="[
                        { value: '', label: '无' },
                        ...(financeStore.categories.find(c => c.id === e.category)?.children || []).map(sub => ({ value: sub.id, label: sub.name }))
                      ]"
                      placeholder="无"
                    />
                  </td>
                  <td>
                    <GlassSelect
                      v-model="e.ledger"
                      select-class="input input-sm batch-input"
                      size="sm"
                      style="width:90px;"
                      :options="financeStore.ledgers.map(l => ({ value: l, label: l }))"
                      placeholder="选择"
                    />
                  </td>
                  <td>
                    <input class="input input-sm batch-input" type="date" v-model="e.date" style="width:130px;" />
                  </td>
                  <td>
                    <input class="input input-sm batch-input" v-model="e.note" style="width:120px;" placeholder="备注" />
                  </td>
                  <td style="text-align:center;">
                    <button class="btn btn-sm btn-ghost" @click="removeBatchRow(i)" title="删除" style="color:#EF4444;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="form-actions" style="margin-top:16px;">
            <span class="batch-stats">共 {{ batchEntries.length }} 条，选中 {{ batchSelected.size }} 条</span>
            <div style="flex:1;"></div>
            <button class="btn btn-ghost" @click="showBatchModal = false">取消</button>
            <button class="btn btn-primary" @click="saveBatchEntries">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              确认导入
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useFinanceStore, useInfoStore, useSettingsStore, INFO_TYPES } from '../stores/index.js'
import { todayStr, nowStr } from '../utils/storage'
import dayjs from 'dayjs'
import GlassSelect from '../components/common/GlassSelect.vue'

const financeStore = useFinanceStore()
const infoStore = useInfoStore()
const settingsStore = useSettingsStore()

const tabs = [
  { id: 'overview', name: '总览' },
  { id: 'library', name: '财务库' },
  { id: 'info', name: '信息库' },
]
const activeTab = ref(settingsStore.activeSubTabs['/finance'] || 'overview')
watch(activeTab, (v) => settingsStore.setActiveSubTab('/finance', v))
watch(() => settingsStore.activeSubTabs['/finance'], (v) => { if (v && v !== activeTab.value) activeTab.value = v })

// ===== 搜索/筛选 =====
const searchQuery = ref('')
const filterType = ref('')
const filterCategory = ref('')
const filterLedger = ref('')

const filteredEntries = computed(() => {
  let list = financeStore.sortedEntries
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e => {
      const catName = financeStore.getCategoryDisplayName(e) || ''
      return (e.note || '').toLowerCase().includes(q) || catName.toLowerCase().includes(q)
    })
  }
  if (filterType.value) list = list.filter(e => e.type === filterType.value)
  if (filterCategory.value) list = list.filter(e => e.category === filterCategory.value)
  if (filterLedger.value) list = list.filter(e => e.ledger === filterLedger.value)
  return list
})

function clearFilters() {
  searchQuery.value = ''
  filterType.value = ''
  filterCategory.value = ''
  filterLedger.value = ''
}

function onSortChange() {
  financeStore.setSortOrder(financeStore.sortOrder)
}
function toggleSortDir() {
  financeStore.setSortDirection(financeStore.sortDirection === 'desc' ? 'asc' : 'desc')
}

// ===== 添加/编辑弹窗 =====
const showEntryModal = ref(false)
const editingEntry = ref(null)
const entryForm = reactive({
  type: 'expense',
  amount: null,
  category: 'food',
  subCategory: '',
  date: todayStr(),
  ledger: '日常账本',
  currency: 'CNY',
  note: '',
})

// 当前选中一级分类下的二级分类列表
const currentSubCategories = computed(() => {
  const cat = financeStore.categories.find(c => c.id === entryForm.category)
  return (cat && cat.children) || []
})

function onFormCategoryChange() {
  entryForm.subCategory = ''
}

function openAddEntry() {
  editingEntry.value = null
  entryForm.type = 'expense'
  entryForm.amount = null
  entryForm.category = financeStore.categories[0]?.id || 'other'
  entryForm.subCategory = ''
  entryForm.date = todayStr()
  entryForm.ledger = financeStore.ledgers[0] || '日常账本'
  entryForm.currency = 'CNY'
  entryForm.note = ''
  showEntryModal.value = true
}

function openEditEntry(e) {
  editingEntry.value = e
  entryForm.type = e.type || 'expense'
  entryForm.amount = e.amount
  entryForm.category = e.category
  entryForm.subCategory = e.subCategory || ''
  entryForm.date = e.date
  entryForm.ledger = e.ledger || financeStore.ledgers[0] || '日常账本'
  entryForm.currency = e.currency || 'CNY'
  entryForm.note = e.note || ''
  showEntryModal.value = true
}

function closeEntryModal() {
  showEntryModal.value = false
  editingEntry.value = null
}

function saveEntry() {
  if (!entryForm.amount || entryForm.amount <= 0) {
    alert('请输入有效金额')
    return
  }
  if (editingEntry.value) {
    financeStore.updateEntry(editingEntry.value.id, { ...entryForm })
  } else {
    financeStore.addEntry({ ...entryForm })
  }
  closeEntryModal()
  activeTab.value = 'library'
}

function deleteEntry(e) {
  if (confirm(`确认删除这笔记录？\n${financeStore.getCategoryDisplayName(e)} ${e.currency || ''} ${e.amount}`)) {
    financeStore.deleteEntry(e.id)
  }
}

function deleteEntryFromModal() {
  if (editingEntry.value) {
    if (confirm('确认删除这笔记录？')) {
      financeStore.deleteEntry(editingEntry.value.id)
      closeEntryModal()
    }
  }
}

// ===== 配置弹窗 =====
const showConfigModal = ref(false)
const budgetInput = ref(financeStore.monthlyBudget)
const currencyInput = ref(financeStore.currency)
const newCategory = reactive({ name: '', color: '#6B7280' })
const newLedgerName = ref('')
const newCurrencyCode = ref('')
const subCategoryInput = reactive({})
const subColorInput = reactive({})

function saveConfig() {
  financeStore.setMonthlyBudget(budgetInput.value)
  financeStore.setCurrency(currencyInput.value || '¥')
  showConfigModal.value = false
}

function onCatColorChange(cat) {
  financeStore.updateCategory(cat.id, { color: cat.color })
}

function onSubCatColorChange(cat, sub) {
  financeStore.updateCategory(sub.id, { color: sub.color })
}

function addCategory() {
  if (!newCategory.name.trim()) return
  financeStore.addCategory({ name: newCategory.name, color: newCategory.color })
  newCategory.name = ''
  newCategory.color = '#6B7280'
}

function removeCategory(id) {
  if (id === 'other') return
  if (confirm('删除该分类后，该分类下的记录将归入"其他"，确认删除？')) {
    financeStore.deleteCategory(id)
  }
}

function addSubCategory(parentId) {
  const name = subCategoryInput[parentId]
  if (!name || !name.trim()) return
  const color = subColorInput[parentId] || '#6B7280'
  financeStore.addCategory({ parentId, name, color })
  subCategoryInput[parentId] = ''
  subColorInput[parentId] = '#6B7280'
}

function removeSubCategory(parentId, subId) {
  if (confirm('确认删除该二级分类？')) {
    financeStore.deleteCategory(subId)
  }
}

function addLedger() {
  if (!newLedgerName.value.trim()) return
  financeStore.addLedger(newLedgerName.value.trim())
  newLedgerName.value = ''
}

function removeLedger(name) {
  if (confirm(`确认删除账本"${name}"？`)) {
    financeStore.removeLedger(name)
  }
}

function addCurrency() {
  if (!newCurrencyCode.value.trim()) return
  financeStore.addCurrency(newCurrencyCode.value.trim().toUpperCase())
  newCurrencyCode.value = ''
}

function removeCurrency(code) {
  if (confirm(`确认删除币种"${code}"？`)) {
    financeStore.removeCurrency(code)
  }
}

// ===== 导入/导出 =====
const fileInputRef = ref(null)
const importResult = ref(null)
const showExportMenu = ref(false)

// ===== 批量编辑 =====
const showBatchModal = ref(false)
const batchEntries = ref([])       // 解析后的待保存条目数组
const batchSelected = ref(new Set()) // 选中的行索引
const batchAllSelected = computed({
  get: () => batchEntries.value.length > 0 && batchEntries.value.every((_, i) => batchSelected.value.has(i)),
  set: (val) => {
    batchSelected.value = new Set(val ? batchEntries.value.map((_, i) => i) : [])
  },
})
// 批量设置字段
const batchField = ref('category')
const batchValue = ref('')
const batchValueSub = ref('')

const batchFieldOptions = [
  { value: 'type', label: '类型' },
  { value: 'category', label: '分类' },
  { value: 'ledger', label: '账本' },
  { value: 'currency', label: '币种' },
  { value: 'date', label: '日期' },
  { value: 'note', label: '备注' },
]

// 当批量设置字段选择分类时，显示二级分类
const batchSubCategories = computed(() => {
  if (batchField.value !== 'category') return []
  const cat = financeStore.categories.find(c => c.id === batchValue.value)
  return (cat && cat.children) || []
})

function applyBatchField() {
  if (batchSelected.value.size === 0) {
    alert('请先勾选要修改的行')
    return
  }
  const field = batchField.value
  const val = batchValue.value
  for (const i of batchSelected.value) {
    if (batchEntries.value[i]) {
      if (field === 'category') {
        batchEntries.value[i].category = val
        batchEntries.value[i].subCategory = batchValueSub.value || ''
      } else if (field === 'type') {
        batchEntries.value[i].type = val
      } else {
        batchEntries.value[i][field] = val
      }
    }
  }
  // 重置批量设置
  batchValue.value = ''
  batchValueSub.value = ''
}

function removeBatchRow(index) {
  batchEntries.value.splice(index, 1)
  // 重建选中集合
  const newSet = new Set()
  for (const i of batchSelected.value) {
    if (i < index) newSet.add(i)
    else if (i > index) newSet.add(i - 1)
  }
  batchSelected.value = newSet
}

function saveBatchEntries() {
  if (batchEntries.value.length === 0) {
    alert('没有可导入的记录')
    return
  }
  // 校验金额
  for (const e of batchEntries.value) {
    if (!e.amount || e.amount <= 0) {
      alert(`存在金额无效的记录（金额: ${e.amount}），请检查后再保存`)
      return
    }
  }
  const result = financeStore.batchAddEntries(batchEntries.value)
  importResult.value = result
  showBatchModal.value = false
  batchEntries.value = []
  batchSelected.value = new Set()
  activeTab.value = 'library'
}

function toggleBatchRow(i) {
  const newSet = new Set(batchSelected.value)
  if (newSet.has(i)) newSet.delete(i)
  else newSet.add(i)
  batchSelected.value = newSet
}

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}

function triggerImport() {
  fileInputRef.value?.click()
}

async function onFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  const ext = file.name.toLowerCase().split('.').pop()
  let result
  if (ext === 'xlsx' || ext === 'xls') {
    result = await financeStore.parseExcelToEntries(file)
  } else {
    const text = await file.text()
    result = financeStore.parseCSVToEntries(text)
  }
  event.target.value = ''
  if (result.error) {
    importResult.value = { added: 0, skipped: 0, error: result.error }
    return
  }
  if (result.entries.length === 0) {
    importResult.value = { added: 0, skipped: result.skipped }
    return
  }
  // 打开批量编辑弹窗
  batchEntries.value = result.entries
  batchSelected.value = new Set(result.entries.map((_, i) => i))
  showBatchModal.value = true
}

function exportCSV() {
  showExportMenu.value = false
  financeStore.exportCSV()
}

async function exportExcel() {
  showExportMenu.value = false
  await financeStore.exportExcel()
}

// ===== 工具函数 =====
function formatMoney(n) {
  return Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getPercent(amount) {
  const total = financeStore.totalExpense
  if (!total || total === 0) return 0
  return Math.round((amount / total) * 100)
}

// ===== 信息库 =====
const infoSearchQuery = ref('')
const showInfoModal = ref(false)
const editingInfoItem = ref(null)
const showInfoConfigModal = ref(false)
const infoForm = reactive({
  // 订阅
  name: '', level: '', category: '', cycle: '单次付', amount: null, startDate: '', expireDate: '',
  // 团购
  merchant: '', platform: '', availableTime: '', couponCode: '', status: '未使用',
  // 卡证
  type: '', issueDate: '', permanent: false,
  // 资产
  brand: '', model: '', purchaseDate: '', warrantyDate: '', price: null, channel: '', status: '', location: '',
  // 手机套餐
  carrier: '移动', planType: '', data: '',
  note: '',
})

const filteredInfoItems = computed(() => {
  const q = (infoSearchQuery.value || '').toLowerCase()
  if (!q) return infoStore.currentList
  return infoStore.currentList.filter(item => {
    const haystack = Object.values(item).join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

function switchInfoType(type) {
  infoStore.setActiveTab(type)
  infoSearchQuery.value = ''
}

function resetInfoForm() {
  Object.assign(infoForm, {
    name: '', level: '', category: '', cycle: '单次付', amount: null, startDate: '', expireDate: '',
    merchant: '', platform: '', availableTime: '', couponCode: '', status: '未使用',
    type: '', issueDate: '', permanent: false,
    brand: '', model: '', purchaseDate: '', warrantyDate: '', price: null, channel: '', status: '', location: '',
    carrier: '移动', planType: '', data: '',
    note: '',
  })
}

function openInfoAdd() {
  editingInfoItem.value = null
  resetInfoForm()
  // 根据当前类型设置默认选项
  if (infoStore.activeType === 'subscription') {
    const cats = infoStore.optionNames('subCategory')
    if (cats.length) infoForm.category = cats[0]
    const cycles = infoStore.optionNames('subCycle')
    if (cycles.length) infoForm.cycle = cycles[0]
  } else if (infoStore.activeType === 'groupbuy') {
    const plats = infoStore.optionNames('groupPlatform')
    if (plats.length) infoForm.platform = plats[0]
    const statuses = infoStore.optionNames('groupStatus')
    if (statuses.length) infoForm.status = statuses[0]
  } else if (infoStore.activeType === 'card') {
    const types = infoStore.optionNames('cardType')
    if (types.length) infoForm.type = types[0]
  } else if (infoStore.activeType === 'asset') {
    const channels = infoStore.optionNames('assetChannel')
    if (channels.length) infoForm.channel = channels[0]
    const statuses = infoStore.optionNames('assetStatus')
    if (statuses.length) infoForm.status = statuses[0]
  }
  showInfoModal.value = true
}

function openInfoEdit(item) {
  editingInfoItem.value = item
  resetInfoForm()
  Object.assign(infoForm, { ...item })
  if (infoForm.permanent === undefined) infoForm.permanent = false
  showInfoModal.value = true
}

function closeInfoModal() {
  showInfoModal.value = false
  editingInfoItem.value = null
}

function saveInfoItem() {
  if (!infoForm.name || !infoForm.name.trim()) {
    alert('请输入名称')
    return
  }
  const type = infoStore.activeType
  const payload = { ...infoForm }
  delete payload.id
  delete payload.seq
  delete payload.createdAt
  if (editingInfoItem.value) {
    infoStore.updateItem(type, editingInfoItem.value.id, payload)
  } else {
    infoStore.addItem(type, payload)
  }
  closeInfoModal()
}

function deleteInfoItem(item) {
  if (confirm(`确认删除这条${infoStore.typeName}记录？`)) {
    infoStore.deleteItem(infoStore.activeType, item.id)
  }
}

function deleteInfoFromModal() {
  if (editingInfoItem.value) {
    if (confirm('确认删除这条记录？')) {
      infoStore.deleteItem(infoStore.activeType, editingInfoItem.value.id)
      closeInfoModal()
    }
  }
}

// ===== 信息库配置弹窗 =====
function addInfoConfigItem(key) {
  const name = prompt('请输入选项名称：')
  if (!name || !name.trim()) return
  const ok = infoStore.addCustomOption(key, name.trim())
  if (!ok) alert('该选项已存在')
}
function updateInfoConfigName(key, id, newName) {
  infoStore.updateOptionName(key, id, newName)
}
function moveInfoConfigItem(key, fromIndex, toIndex) {
  infoStore.moveOption(key, fromIndex, toIndex)
}
function deleteInfoConfigItem(key, id) {
  const ok = infoStore.deleteOption(key, id)
  if (ok === false) alert('预置项至少保留一个')
}
function updateInfoConfigColor(key, id, color) {
  infoStore.updateOptionColor(key, id, color)
}

// ===== 到期辅助函数 =====
function isInfoExpiring(dateStr) {
  if (!dateStr) return false
  const d = dayjs(dateStr)
  const today = dayjs()
  return d.isBefore(today, 'day') || d.isSame(today, 'day') || d.diff(today, 'day') <= 3
}
function isInfoExpired(dateStr) {
  if (!dateStr) return false
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}
function groupStatusClass(status) {
  if (status === '已使用') return 'type-income'
  if (status === '已过期') return 'type-expense'
  return 'type-neutral'
}
// 资产状态 badge 内联样式（从自定义选项中查找颜色）
function assetStatusStyle(status) {
  if (!status) return ''
  const opts = infoStore.optionList('assetStatus')
  const opt = opts.find(o => o.name === status)
  if (opt && opt.color) {
    return `background:${opt.color}1a;color:${opt.color};`
  }
  return ''
}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.finance-center-page { max-width: 100%; padding: 0 4px; }

/* ===== Tab 栏：胶囊样式（对齐 PaperCenter） ===== */
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

/* ===== 卡片 / 头部按钮（对齐 PaperCenter） ===== */
.section-card { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-header-actions { display: flex; gap: 8px; align-items: center; }
.card-title { font-size: 16px; font-weight: 600; }
.text-xs { font-size: 12px; }
.text-tertiary { color: var(--color-text-tertiary); }

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

/* 导出下拉菜单 */
.export-dropdown { position: relative; }
.export-menu {
  position: absolute; top: 100%; right: 0; margin-top: 4px;
  background: rgba(255, 255, 255, 0.92); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 100;
  display: flex; flex-direction: column; gap: 2px; padding: 4px; min-width: 160px;
}
.export-menu button {
  display: flex; align-items: center; gap: 6px; padding: 8px 12px;
  border: none; background: transparent; font-size: 13px; color: var(--color-text-primary);
  cursor: pointer; border-radius: var(--radius-md); transition: background var(--transition-fast);
}
.export-menu button:hover { background: var(--color-bg-hover); }

/* ===== 筛选栏（对齐 PaperCenter） ===== */
.filter-bar { margin-bottom: 12px; padding: 12px; background: var(--color-bg); border-radius: var(--radius-md); }
.filter-search-row { margin-bottom: 8px; }
.filter-search-full { width: 100%; }
.filter-selects-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.filter-select-col { width: 100%; }
.filter-bottom-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-clear { flex-shrink: 0; color: var(--color-text-tertiary); font-size: 12px; cursor: pointer; background: transparent; border: none; transition: color var(--transition-fast); }
.filter-clear:hover { color: var(--color-primary); }
.filter-stats { font-size: 12px; color: var(--color-text-tertiary); white-space: nowrap; margin-left: auto; }

/* ===== 表格（对齐 PaperCenter） ===== */
.paper-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  max-width: 100%;
}
.paper-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: auto;
}
.paper-table th {
  position: sticky; top: 0; background: var(--color-bg);
  padding: 10px 10px; text-align: center; color: var(--color-text-secondary);
  font-weight: 600; border-bottom: 1px solid var(--color-border-light); white-space: nowrap; z-index: 1;
  position: relative;
  user-select: none;
}
.paper-table td {
  padding: 8px 10px; border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-primary); text-align: center; vertical-align: middle;
  white-space: nowrap;
}
.paper-row { transition: background var(--transition-fast); }
.paper-row:hover td { background: var(--color-bg-hover); }
.paper-table tr:last-child td { border-bottom: none; }

/* 列宽自适应：各列按内容自适应，备注列允许截断换行 */
.col-seq { width: auto; min-width: 40px; }
.col-date { width: auto; min-width: 90px; }
.col-ledger { width: auto; min-width: 70px; }
.col-category { width: auto; min-width: 80px; }
.col-type { width: auto; min-width: 56px; }
.col-amount { width: auto; min-width: 80px; }
.col-currency { width: auto; min-width: 50px; }
.col-note {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-actions { width: 80px; white-space: nowrap; }

/* ===== 表格内徽章 ===== */
.entry-category-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: var(--radius-full);
  font-size: 12px; font-weight: 500; border: 1px solid transparent;
}
.entry-type-badge {
  display: inline-block; padding: 2px 10px; border-radius: var(--radius-full);
  font-size: 12px; font-weight: 500;
}
.type-expense { background: #FEF3F2; color: #EF4444; }
.type-income { background: #ECFDF3; color: #10B981; }
.entry-amount { font-weight: 600; color: #EF4444; }
.entry-amount.amount-income { color: #10B981; }

/* ===== 统计卡片 ===== */
.finance-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.stat-card {
  display: flex; align-items: center; gap: 14px; padding: 18px 20px;
}
.stat-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-body { display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 12px; color: var(--color-text-tertiary); }
.stat-value { font-size: 22px; font-weight: 700; color: var(--color-text-primary); }
.stat-negative { color: #EF4444 !important; }

/* ===== 预算条 ===== */
.budget-bar-wrap { display: flex; align-items: center; gap: 12px; padding: 0 4px; }
.budget-bar-track {
  flex: 1; height: 12px; background: var(--color-bg-hover);
  border-radius: 6px; overflow: hidden;
}
.budget-bar-fill { height: 100%; border-radius: 6px; transition: width .4s ease, background .3s; }
.budget-percent { font-size: 14px; font-weight: 600; min-width: 40px; text-align: right; }

/* ===== 总览 grid ===== */
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
@media (max-width: 800px) { .overview-grid { grid-template-columns: 1fr; } }

/* ===== 分类条形图 ===== */
.category-bars { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
.category-bar-item { display: flex; flex-direction: column; gap: 4px; }
.category-bar-info { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.category-bar-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.category-bar-name { font-weight: 500; color: var(--color-text-primary); }
.category-bar-amount { margin-left: auto; font-weight: 600; }
.category-bar-pct { color: var(--color-text-tertiary); min-width: 36px; text-align: right; }
.category-bar-track { height: 8px; background: var(--color-bg-hover); border-radius: 4px; overflow: hidden; }
.category-bar-fill { height: 100%; border-radius: 4px; transition: width .4s ease; }

/* ===== 最近记录 ===== */
.recent-list { display: flex; flex-direction: column; gap: 8px; }
.recent-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-radius: var(--radius-md); background: var(--color-bg); font-size: 13px;
}
.recent-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.recent-cat-name { font-weight: 500; min-width: 50px; }
.recent-note { color: var(--color-text-tertiary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-amount { font-weight: 600; color: #EF4444; }
.recent-amount.amount-income { color: #10B981; }
.recent-date { color: var(--color-text-tertiary); font-size: 12px; }

/* ===== 弹窗表单 ===== */
.entry-form { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row-inline { display: flex; gap: 12px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
.form-type-switch {
  display: inline-flex; background: var(--color-bg); border-radius: var(--radius-md); padding: 3px;
}
.type-switch-btn {
  padding: 8px 32px; border: none; background: transparent;
  font-size: 14px; font-weight: 500; color: var(--color-text-secondary);
  border-radius: var(--radius-md); cursor: pointer; transition: all .2s;
}
.type-switch-btn.active { background: var(--color-bg-card); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.type-switch-btn.active:nth-child(1) { color: #EF4444; }
.type-switch-btn.active:nth-child(2) { color: #10B981; }

/* ===== 分类选择器 ===== */
.category-picker { display: flex; flex-wrap: wrap; gap: 8px; }
.category-pick-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: transparent; font-size: 13px; color: var(--color-text-secondary);
  cursor: pointer; transition: all .15s;
}
.category-pick-btn:hover { border-color: var(--color-primary); }
.category-pick-btn.active { font-weight: 600; }

.form-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; }

/* ===== 配置弹窗 ===== */
.config-section { margin-top: 20px; }
.config-section-title { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; margin-bottom: 10px; }
.config-row { display: flex; align-items: center; gap: 12px; }
.config-hint { font-size: 12px; color: var(--color-text-tertiary); }
.category-list-config { display: flex; flex-direction: column; gap: 8px; }
.category-config-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-radius: var(--radius-md); background: var(--color-bg);
}
.cat-color-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.cat-name { flex: 1; font-size: 13px; }
.add-category-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }

/* 分类树形结构 */
.category-tree-item { margin-bottom: 8px; }
.category-tree-l1 { font-weight: 600; }
.category-children { padding-left: 24px; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
.category-tree-l2 { font-size: 12px; font-weight: 400; }
.add-sub-category-row {
  padding-left: 24px;
  display: flex; align-items: center; gap: 8px;
  margin-top: 4px;
}

/* ===== 空状态（对齐 PaperCenter） ===== */
.empty-state { text-align: center; color: var(--color-text-tertiary); font-size: 14px; }
.empty-state-icon { font-size: 32px; margin-bottom: 8px; opacity: .5; }
.empty-state p { font-size: 13px; }

/* ===== 批量编辑弹窗 ===== */
.batch-modal-overlay { z-index: 10001; }
.batch-modal-content { max-width: 90vw !important; }
.batch-set-area {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  margin-bottom: 12px;
}
.batch-set-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.batch-set-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); white-space: nowrap; }
.batch-set-hint { font-size: 12px; color: var(--color-text-tertiary); margin-top: 8px; }
.batch-table-wrapper {
  overflow: auto;
  max-height: 50vh;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
}
.batch-table th {
  position: sticky; top: 0; background: var(--color-bg);
  padding: 8px 6px; text-align: center; font-size: 12px;
  font-weight: 600; color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border-light); white-space: nowrap; z-index: 1;
}
.batch-table td {
  padding: 4px 6px; border-bottom: 1px solid var(--color-border-light);
  text-align: center; vertical-align: middle; white-space: nowrap;
}
.batch-input { font-size: 12px !important; padding: 4px 6px !important; }
.batch-row-selected td { background: rgba(59, 130, 246, 0.04); }
.batch-stats { font-size: 12px; color: var(--color-text-tertiary); }

/* ===== 信息库 ===== */
.info-type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.info-type-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-full);
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all .15s;
}
.info-type-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.info-type-btn.active {
  background: var(--color-primary);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
}

/* ===== 信息库配置弹窗 ===== */
.info-config-overlay { z-index: 2100; }
.cfg-grid-inner {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.checkbox-inline {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--color-text-secondary);
  cursor: pointer; white-space: nowrap;
}
.checkbox-inline input { cursor: pointer; }

.type-neutral { color: var(--color-text-tertiary); }

/* 资产状态颜色选择器 */
.cfg-color-picker {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 2px;
  background: var(--color-bg);
  flex-shrink: 0;
}
.cfg-color-picker::-webkit-color-swatch-wrapper { padding: 0; }
.cfg-color-picker::-webkit-color-swatch { border: none; border-radius: 4px; }
</style>
