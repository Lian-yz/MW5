<template>
  <div class="sim-page">
    <!-- 顶部 Tab 导航 -->
    <div class="tab-bar">
      <div class="tab-pill">
        <button class="tab-btn" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">总览</button>
        <button class="tab-btn" :class="{ active: activeTab === 'library' }" @click="activeTab = 'library'">仿真列表</button>
      </div>
    </div>

    <!-- ============ 总览 ============ -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <div class="stat-row">
        <div class="stat-card" v-for="s in simStore.statusOptions" :key="s.id" :style="{ borderTopColor: s.color }">
          <div class="stat-num" :style="{ color: s.color }">{{ simStore.statusCounts[s.id] }}</div>
          <div class="stat-label">{{ s.name }}</div>
        </div>
      </div>

      <div class="overview-grid">
        <div class="card sim-card">
          <h3 class="card-title">仿真状态分布</h3>
          <div ref="chartRef" class="sim-chart"></div>
        </div>

        <div class="card sim-card">
          <h3 class="card-title">最近仿真</h3>
          <div class="recent-list">
            <div v-if="!simStore.recent.length" class="empty-hint">暂无仿真记录</div>
            <div v-for="sim in simStore.recent" :key="sim.id" class="recent-item" @click="openDetail(sim)">
              <span class="recent-seq">{{ sim.seq }}</span>
              <span class="status-badge" :style="statusBadgeStyle(sim.status)">{{ statusName(sim.status) }}</span>
              <span class="recent-subject">{{ sim.subject || '未命名仿真' }}</span>
              <span class="recent-time">{{ (sim.startTime || '').replace('T', ' ') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 仿真列表 ============ -->
    <div v-if="activeTab === 'library'" class="tab-content">
      <div class="card section-card">
        <!-- 标题栏：仿真列表标题 + 设置/导出/添加按钮同一行 -->
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="database" />  仿真列表</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="showSimConfigModal = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              仿真列表配置
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
            <button class="header-btn header-btn-primary" @click="openAdd">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加仿真
            </button>
          </div>
        </div>
        <!-- 排序与搜索 -->
        <div class="toolbar">
          <span class="sort-label">排序：</span>
          <GlassSelect
            v-model="sortBy"
            style="width:auto;"
            select-class="input input-sm filter-select"
            size="sm"
            :options="[
              { value: 'time', label: '仿真时间' },
              { value: 'status', label: '状态' }
            ]"
          />
          <button class="btn btn-sm btn-ghost sort-dir-btn" @click="toggleSortDir" :title="sortDir === 'asc' ? '当前：升序（远→近）' : '当前：降序（近→远）'">
            {{ sortDir === 'asc' ? '↑ 升序' : '↓ 降序' }}
          </button>
          <GlassSelect
            v-model="searchField"
            style="width:auto;"
            select-class="input input-sm filter-select"
            size="sm"
            :options="[
              { value: 'time', label: '搜索: 仿真时间' },
              { value: 'software', label: '搜索: 仿真软件' }
            ]"
          />
          <input class="input input-sm filter-search" v-model="searchQuery" :placeholder="searchField === 'time' ? '搜索仿真时间...' : '搜索仿真软件...'" style="width:200px;" />
        </div>
      </div>

      <div class="card sim-card">
        <table class="sim-table">
          <thead>
            <tr>
              <th v-if="colVis('seq')" class="col-seq">编号</th>
              <th v-if="colVis('status')" class="col-status">状态</th>
              <th v-if="colVis('subject')">仿真主题</th>
              <th v-if="colVis('detail')">仿真细节备注</th>
              <th v-if="colVis('software')">仿真软件</th>
              <th v-if="colVis('startTime')" class="col-time">开始仿真</th>
              <th v-if="colVis('endTime')" class="col-time">仿真截止</th>
              <th v-if="colVis('result')">仿真结果</th>
              <th v-if="colVis('fileLocation')">文件存放位置</th>
              <th v-if="colVis('linkedPlan')">关联计划</th>
              <th v-if="colVis('notes')">备注</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!displayed.length">
              <td :colspan="visibleColCount + 1" class="empty-cell">暂无仿真记录，点击「添加仿真」开始</td>
            </tr>
            <tr v-for="sim in displayed" :key="sim.id" @click="openDetail(sim)" @dblclick="openEdit(sim)">
              <td v-if="colVis('seq')" class="col-seq">{{ sim.seq }}</td>
              <td v-if="colVis('status')" class="col-status">
                <span class="status-badge" :style="statusBadgeStyle(sim.status)">{{ statusName(sim.status) }}</span>
              </td>
              <td v-if="colVis('subject')" class="cell-subject">{{ sim.subject || '未命名仿真' }}</td>
              <td v-if="colVis('detail')" class="cell-text">{{ latestRecord(sim)?.detail || '—' }}</td>
              <td v-if="colVis('software')" class="cell-text">{{ formatSoftware(latestRecord(sim)?.software) }}</td>
              <td v-if="colVis('startTime')" class="col-time">{{ (sim.startTime || '').replace('T', ' ') }}</td>
              <td v-if="colVis('endTime')" class="col-time">{{ (latestRecord(sim)?.recordTime || '').replace('T', ' ') || '—' }}</td>
              <td v-if="colVis('result')" class="cell-result">{{ latestRecord(sim)?.result || '—' }}</td>
              <td v-if="colVis('fileLocation')" class="cell-text">{{ latestRecord(sim)?.fileLocation || '—' }}</td>
              <td v-if="colVis('linkedPlan')" class="cell-text">{{ linkedPlanName(sim.linkedPlanId) || '—' }}</td>
              <td v-if="colVis('notes')" class="cell-text">{{ sim.notes || '—' }}</td>
              <td class="col-op">
                <div class="op-wrap">
                  <button class="soft-btn" @click.stop="openEdit(sim)" title="编辑">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="soft-btn soft-btn-danger" @click.stop="confirmDelete(sim)" title="删除">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ==================== 仿真列表配置弹窗 ==================== -->
    <div v-if="showSimConfigModal" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showSimConfigModal = false })">
      <div class="modal-content config-modal">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title"><AppIcon name="settings" />  仿真列表配置</h3>
          </div>
          <p class="text-xs text-tertiary" style="margin-bottom: 16px;">配置仿真列表表格列显示与仿真状态。修改即时生效。</p>

          <div class="cfg-grid">
            <!-- 仿真列表表格列显示 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                仿真列表表格列显示
              </h4>
              <div class="cfg-list">
                <div v-for="(col, i) in colDefs" :key="col.key" class="cfg-item">
                  <input type="checkbox" v-model="col.visible" />
                  <span class="cfg-col-label">{{ col.label }}</span>
                  <button class="soft-btn-icon" @click="moveSimColumnCfg(i, -1)" :disabled="i === 0" title="上移">↑</button>
                  <button class="soft-btn-icon" @click="moveSimColumnCfg(i, 1)" :disabled="i === colDefs.length - 1" title="下移">↓</button>
                </div>
                <button class="soft-btn-ghost btn-sm" style="margin-top:6px;" @click="resetSimColumnsCfg">恢复默认列</button>
              </div>
            </div>

            <!-- 仿真状态管理 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
                仿真状态管理
              </h4>
              <div class="cfg-list">
                <div v-for="st in simStore.statusOptions" :key="st.id" class="cfg-item">
                  <input type="color" class="cfg-color" :value="st.color" @change="onStatusColor(st, $event)" title="颜色" />
                  <input class="input cfg-name" :value="st.name" @change="onStatusName(st, $event)" maxlength="12" placeholder="状态名称" />
                  <span v-if="st.builtin" class="cfg-tag" title="内置状态，不可删除，但可改名/改色">内置</span>
                  <button v-else class="soft-btn-icon danger" @click="onRemoveStatus(st)" title="删除">✕</button>
                </div>
                <div style="display:flex; gap:6px; margin-top: 4px;">
                  <button class="soft-btn btn-sm" @click="onAddStatus">+ 添加状态</button>
                  <button class="soft-btn-ghost btn-sm" @click="onResetStatusConfig">恢复默认</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 添加 / 编辑 仿真（仅录入"初始信息"） ============ -->
    <div v-if="showForm" class="modal-overlay" @mousedown.self="onFormMaskDown" @mouseup.self="onFormMaskUp">
      <div class="modal sim-modal" @mousedown="formMaskDowned = false">
        <div class="modal-head">
          <h3 class="modal-title">{{ editingSim ? '编辑仿真' : '添加仿真' }}</h3>
          <div class="modal-head-actions">
            <button class="soft-btn soft-btn-text soft-btn-primary" @click="saveForm" :title="editingSim ? '保存' : '添加'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {{ editingSim ? '保存' : '添加' }}
            </button>
            <button class="soft-btn soft-btn-close" @click="closeForm" title="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">仿真编号 <span class="hint">（自动生成，可修改）</span></label>
            <input class="input" v-model="form.code" placeholder="YYYYMMDDHHmmss + 序号" />
          </div>
          <div class="form-field">
            <label class="form-label">仿真状态</label>
            <GlassSelect
              v-model="form.status"
              select-class="input"
              :options="simStore.statusOptions.map(s => ({ value: s.id, label: s.name }))"
            />
          </div>
          <div class="form-field span-2">
            <label class="form-label">仿真主题 <span style="color:var(--color-danger);">*</span></label>
            <input class="input" v-model="form.subject" placeholder="例如：车辆动力学联合仿真" />
          </div>
          <div class="form-field">
            <label class="form-label">开始仿真</label>
            <input class="input" type="datetime-local" v-model="form.startTime" />
          </div>
          <div class="form-field">
            <label class="form-label">关联计划（可选）</label>
            <GlassSelect
              v-model="form.linkedPlanId"
              select-class="input"
              :options="[{ value: '', label: '不关联' }, ...planOptions.map(p => ({ value: p.id, label: p.title || '未命名计划' }))]"
            />
          </div>
          <div class="form-field span-2">
            <label class="form-label">备注</label>
            <textarea class="input" rows="2" v-model="form.notes" placeholder="该仿真实验的整体备注"></textarea>
          </div>
        </div>
        <div class="modal-actions" style="justify-content: space-between;">
          <span class="hint">保存后可在详情弹窗中新增每条"仿真记录"</span>
          <div style="display:flex; gap:8px;">
            <button v-if="editingSim" class="btn btn-danger btn-sm" @click="deleteCurrent"><AppIcon name="trash" />  删除</button>
            <button class="btn btn-primary btn-sm" @click="saveForm">{{ editingSim ? '保存' : '添加' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 仿真详情（只读，单击触发） ============ -->
    <div v-if="showDetail" class="modal-overlay" @click.self="closeDetail">
      <div class="modal sim-modal">
        <div class="detail-head">
          <h3 class="modal-title">仿真详情</h3>
          <div class="modal-head-actions">
            <button class="soft-btn soft-btn-text soft-btn-primary" @click="openAddRecord" title="新增仿真记录">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增仿真记录
            </button>
            <button class="soft-btn soft-btn-close" @click="closeDetail" title="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- 顶部：整个仿真的初始信息 -->
        <div class="detail-section">
          <div class="section-title"><AppIcon name="flask" />  仿真初始信息</div>
          <div class="detail-body">
            <div class="detail-row"><span class="detail-key">编号</span><span class="detail-val">{{ detailSim.seq }}</span></div>
            <div class="detail-row"><span class="detail-key">仿真编号</span><span class="detail-val">{{ detailSim.code }}</span></div>
            <div class="detail-row"><span class="detail-key">状态</span><span class="detail-val"><span class="status-badge" :style="statusBadgeStyle(detailSim.status)">{{ statusName(detailSim.status) }}</span></span></div>
            <div class="detail-row"><span class="detail-key">仿真主题</span><span class="detail-val">{{ detailSim.subject || '—' }}</span></div>
            <div class="detail-row"><span class="detail-key">开始仿真</span><span class="detail-val">{{ (detailSim.startTime || '').replace('T', ' ') || '—' }}</span></div>
            <div class="detail-row"><span class="detail-key">关联计划</span><span class="detail-val">{{ linkedPlanName(detailSim.linkedPlanId) || '—' }}</span></div>
            <div class="detail-row"><span class="detail-key">备注</span><span class="detail-val">{{ detailSim.notes || '—' }}</span></div>
          </div>
        </div>

        <!-- 底部：仿真记录列表 -->
        <div class="detail-section">
          <div class="section-title">
            <span><AppIcon name="file-text" />  仿真记录</span>
            <span class="section-count">共 {{ detailSim.records?.length || 0 }} 条</span>
          </div>
          <div v-if="!detailSim.records || !detailSim.records.length" class="empty-hint">
            暂无仿真记录，点击右上角「新增仿真记录」开始填写
          </div>
          <div v-else class="records-list">
            <div v-for="(r, idx) in detailSim.records" :key="r.id" class="record-card">
              <div class="record-card-head">
                <div class="record-no-badge">{{ detailSim.records.length - idx }}</div>
                <span class="record-title">仿真记录 {{ detailSim.records.length - idx }}</span>
                <span class="record-time"><AppIcon name="calendar" />  {{ (r.recordTime || '').replace('T', ' ') || '未填写时间' }}</span>
                <!-- 信息评价标签：单击弹出 保留/舍弃/暂定 三选 -->
                <button
                  class="soft-btn record-eval-btn"
                  :class="recordEvalClass(r.evaluation)"
                  @click.stop="toggleRecordEvalPopup(r, $event)"
                  :title="recordEvalTitle(r.evaluation)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  {{ recordEvalLabel(r.evaluation) }}
                </button>
                <!-- 评价选项弹出层 -->
                <div v-if="recordEvalPopupId === r.id" class="record-eval-popup" :style="recordEvalPopupStyle" @click.stop>
                  <div class="record-eval-popup-title">为此仿真记录标注评价</div>
                  <button class="record-eval-option eval-keep" @click="setRecordEval(r, 'keep')"><AppIcon name="check-circle" />  保留</button>
                  <button class="record-eval-option eval-discard" @click="setRecordEval(r, 'discard')"><AppIcon name="trash" />  舍弃</button>
                  <button class="record-eval-option eval-pending" @click="setRecordEval(r, 'pending')"> 暂定</button>
                  <button v-if="r.evaluation" class="record-eval-option eval-clear" @click="setRecordEval(r, '')">✖ 取消标注</button>
                </div>
                <!-- 标注理由预览（位于标注 与 编辑 之间） -->
                <div class="record-reason" :title="r.reason || ''" @click.stop>
                  <span v-if="r.reason" class="record-reason-text"><AppIcon name="file-edit" />  标注理由：{{ r.reason }}</span>
                  <span v-else class="record-reason-empty"><AppIcon name="file-edit" />  标注理由（点击右侧「编辑」填写）</span>
                </div>
                <div class="record-actions">
                  <button class="soft-btn" @click="openEditRecord(r)" title="编辑此记录">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    编辑
                  </button>
                  <button class="soft-btn soft-btn-danger" @click="deleteRecord(r)" title="删除此记录">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    删除
                  </button>
                </div>
              </div>
              <div class="record-card-body">
                <!-- 仿真结果：高亮醒目 -->
                <div class="record-block record-block-result">
                  <div class="record-block-label"><AppIcon name="target" />  仿真结果</div>
                  <div class="record-block-content">{{ r.result || '暂无结论' }}</div>
                  <!-- 结果图片：点击放大 -->
                  <div v-if="r.resultImages && r.resultImages.length" class="record-img-list">
                    <div v-for="name in r.resultImages" :key="name" class="record-img-item">
                      <img :src="recordImgUrl(name)" :alt="name" class="record-img-thumb" @click="previewSimImg(name)" />
                    </div>
                  </div>
                </div>
                <!-- 软件版本：chip 标签 -->
                <div class="record-block">
                  <div class="record-block-label"><AppIcon name="wrench" />  仿真软件</div>
                  <div class="record-block-content">
                    <div v-if="formatSoftware(r.software) === '—'" class="record-empty">未填写软件版本</div>
                    <div v-else class="record-software-list">
                      <span v-for="name in formatSoftwareList(r.software)" :key="name" class="record-software-chip">{{ name }}</span>
                    </div>
                  </div>
                </div>
                <!-- 文件位置 -->
                <div class="record-block">
                  <div class="record-block-label"><AppIcon name="folder" />  文件存放位置</div>
                  <div class="record-block-content record-block-mono">{{ r.fileLocation || '—' }}</div>
                </div>
                <!-- 仿真细节 -->
                <div v-if="r.detail" class="record-block">
                  <div class="record-block-label"><AppIcon name="file-edit" />  仿真细节</div>
                  <div class="record-block-content record-block-text">{{ r.detail }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-primary btn-sm" style="margin-left:auto;" @click="goToPlan">前往计划列表</button>
        </div>
      </div>
    </div>

    <!-- ============ 仿真结果图片放大预览 ============ -->
    <div v-if="previewImgUrl" class="modal-overlay img-preview-overlay" @click.self="closeImgPreview">
      <div class="img-preview-box" @click.stop>
        <img :src="previewImgUrl" class="img-preview-main" alt="仿真结果图片" />
        <button class="img-preview-close" @click="closeImgPreview" title="关闭">✕</button>
      </div>
    </div>

    <!-- ============ 新增 / 编辑 仿真记录 ============ -->
    <div v-if="showRecordForm" class="modal-overlay" @mousedown.self="onRecordMaskDown" @mouseup.self="onRecordMaskUp">
      <div class="modal sim-modal" @mousedown="recordMaskDowned = false">
        <div class="modal-head">
          <h3 class="modal-title">{{ editingRecord ? '编辑仿真记录' : '新增仿真记录' }}</h3>
          <div class="modal-head-actions">
            <button class="soft-btn soft-btn-text soft-btn-primary" @click="saveRecord" :title="editingRecord ? '保存' : '添加'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {{ editingRecord ? '保存' : '添加' }}
            </button>
            <button class="soft-btn soft-btn-close" @click="closeRecordForm" title="关闭">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-field span-2">
            <label class="form-label label-row">
              <span>仿真软件版本 <span class="hint">（可多选）</span></span>
              <button class="soft-btn soft-btn-text soft-btn-mini" @click="startCustomSw">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                自定义
              </button>
            </label>
            <div class="chip-group">
              <label v-for="sw in allSoftware" :key="sw.id" class="chip-check" :class="{ active: recordForm.software.includes(sw.id) }">
                <input type="checkbox" :value="sw.id" v-model="recordForm.software" style="display:none;" />
                {{ sw.name }}
                <span v-if="sw.custom" class="chip-del" title="删除该自定义软件" @click.stop.prevent="removeCustomSwFromRecord(sw)">×</span>
              </label>
            </div>
            <div v-if="showCustomSw" class="custom-sw-row">
              <input ref="customSwInput" class="input input-sm" v-model="customSwName" placeholder="输入软件名称，如 Simulink R2023a" @keyup.enter="confirmCustomSw" />
              <button class="btn btn-primary btn-sm" @click="confirmCustomSw">确定</button>
              <button class="btn btn-ghost btn-sm" @click="cancelCustomSw">取消</button>
            </div>
          </div>
          <div class="form-field span-2">
            <label class="form-label">仿真细节</label>
            <textarea class="input" rows="3" v-model="recordForm.detail" placeholder="本条记录的仿真目的、参数设置、关键假设等"></textarea>
          </div>
          <div class="form-field span-2">
            <label class="form-label">仿真时间</label>
            <input class="input" type="datetime-local" v-model="recordForm.recordTime" />
          </div>
          <div class="form-field span-2">
            <label class="form-label">仿真结果</label>
            <textarea class="input" rows="3" v-model="recordForm.result" placeholder="例如：收敛，误差 < 2%（支持多行描述）"></textarea>
            <!-- 仿真结果图片上传：大小不限，桌面端落盘本地文件夹 / 浏览器存 IndexedDB -->
            <div class="sim-img-upload">
              <div class="sim-img-upload-head">
                <span class="sim-img-upload-tip"><AppIcon name="image" />  结果图片（可选，大小不限，可多选）</span>
                <button type="button" class="soft-btn soft-btn-text soft-btn-mini" @click="triggerImgInput">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  添加图片
                </button>
              </div>
              <input ref="imgFilesInput" type="file" accept="image/*" multiple style="display:none;" @change="onImgFilesChange" />
              <div v-if="recordForm.images.length" class="sim-img-list">
                <div v-for="(img, i) in recordForm.images" :key="img.key" class="sim-img-item">
                  <img :src="img.url" class="sim-img-thumb" alt="结果图片" />
                  <button type="button" class="sim-img-del" title="移除" @click="removeImg(i)">✕</button>
                  <span class="sim-img-name">{{ img.name }}</span>
                </div>
              </div>
              <div v-else class="sim-img-empty">尚未添加结果图片</div>
              <div v-if="simImgDirName" class="sim-img-location">
                <AppIcon name="folder" />
                <span>图片存放位置：{{ simImgDirName }}</span>
                <button type="button" class="sim-img-loc-btn" @click="changeSimImgDir" title="选择自定义文件夹">自定义</button>
                <button type="button" class="sim-img-loc-btn" @click="resetSimImgDir" title="恢复默认存放位置">恢复默认</button>
              </div>
            </div>
          </div>
          <div class="form-field span-2">
            <label class="form-label">仿真文件存放位置</label>
            <input class="input" v-model="recordForm.fileLocation" placeholder="例如：D:/Simulations/Case_001/" />
          </div>
          <div class="form-field span-2">
            <label class="form-label">标注理由 <span class="hint">（说明这条仿真记录为什么标记保留 / 舍弃 / 暂定）</span></label>
            <textarea class="input" rows="2" v-model="recordForm.reason" placeholder="例如：收敛曲线与参考论文一致 → 保留；网格划分错误导致能量不守恒 → 舍弃"></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { useRouter } from 'vue-router'
import { useSimulationStore, usePlanStore, useSettingsStore, SIM_SOFTWARE_OPTIONS } from '../stores/index'
import { printHtml } from '../utils/desktopBridge'
import { initSimImgDir, saveSimImage, openSimImage, deleteSimImages, deleteSimImage, getSimImgDirInfo, selectSimImgDir, unbindSimImgDir } from '../utils/simImageStorage'
import GlassSelect from '../components/common/GlassSelect.vue'

const router = useRouter()
const simStore = useSimulationStore()
const planStore = usePlanStore()
const settingsStore = useSettingsStore()

const activeTab = ref(settingsStore.activeSubTabs['/simulation'] || 'overview')
watch(activeTab, (v) => settingsStore.setActiveSubTab('/simulation', v))
watch(() => settingsStore.activeSubTabs['/simulation'], (v) => { if (v && v !== activeTab.value) activeTab.value = v })
const searchQuery = ref('')
const searchField = ref('time')
const sortBy = ref('time')
const sortDir = ref('asc')

const showForm = ref(false)
const editingSim = ref(null)
const showDetail = ref(false)
const detailSim = ref({})

// 自定义软件
const showCustomSw = ref(false)
const customSwName = ref('')
const customSwInput = ref(null)

// 仿真库配置弹窗 + 导出
const showSimConfigModal = ref(false)
const showExportMenu = ref(false)

// 表格列自定义显示
const colDefs = reactive(loadColVis())
function loadColVis() {
  try { return JSON.parse(localStorage.getItem('mw_simColVis') || 'null') || defaultColDefs() } catch { return defaultColDefs() }
}
function defaultColDefs() {
  return [
    { key: 'seq', label: '编号', visible: true },
    { key: 'status', label: '状态', visible: true },
    { key: 'subject', label: '仿真主题', visible: true },
    { key: 'detail', label: '仿真细节备注', visible: false },
    { key: 'software', label: '仿真软件', visible: false },
    { key: 'startTime', label: '开始仿真', visible: true },
    { key: 'endTime', label: '仿真截止', visible: false },
    { key: 'result', label: '仿真结果', visible: true },
    { key: 'fileLocation', label: '文件存放位置', visible: false },
    { key: 'linkedPlan', label: '关联计划', visible: false },
    { key: 'notes', label: '备注', visible: false },
  ]
}
function saveColVis() {
  localStorage.setItem('mw_simColVis', JSON.stringify(colDefs.map(d => ({ key: d.key, label: d.label, visible: d.visible }))))
}
function colVis(key) { const def = colDefs.find(d => d.key === key); return def ? def.visible : true }
const visibleColCount = computed(() => colDefs.filter(d => d.visible).length)
function moveSimColumnCfg(i, dir) {
  const j = i + dir
  if (j < 0 || j >= colDefs.length) return
  const temp = colDefs[i]
  colDefs[i] = colDefs[j]
  colDefs[j] = temp
}
function resetSimColumnsCfg() {
  if (!confirm('恢复默认表格列？')) return
  const defs = defaultColDefs()
  colDefs.splice(0, colDefs.length, ...defs)
}
// 列设置变更时自动保存
watch(colDefs, () => saveColVis(), { deep: true })

// ===== 状态自定义（名称 / 颜色） =====
function onStatusName(st, e) { simStore.updateStatus(st.id, { name: e.target.value }) }
function onStatusColor(st, e) { simStore.updateStatus(st.id, { color: e.target.value }) }
function onAddStatus() { simStore.addCustomStatus('新状态', '#6B7280') }
function onRemoveStatus(st) {
  if (!confirm('删除自定义状态「' + st.name + '」？标记为该状态的仿真将显示为「未知状态」（可重新添加）。')) return
  simStore.removeCustomStatus(st.id)
}
function onResetStatusConfig() {
  if (!confirm('恢复默认状态？所有状态名称与颜色将重置为默认。')) return
  simStore.resetStatusConfig()
}

// ===== 导出 =====
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
function toggleExportMenu() { showExportMenu.value = !showExportMenu.value }
function exportMarkdown() {
  showExportMenu.value = false
  const list = displayed.value
  if (list.length === 0) { alert('没有可导出的仿真记录'); return }
  let md = '# <AppIcon name="wrench" />  仿真记录导出\n\n> 导出时间：' + new Date().toLocaleString() + '  |  共 ' + list.length + ' 条记录\n\n---\n\n'
  list.forEach((sim, i) => {
    const rec = latestRecord(sim)
    md += '## ' + (i + 1) + '. ' + (sim.subject || '未命名仿真') + '\n\n| 字段 | 内容 |\n|------|------|\n'
    md += '| 编号 | ' + (sim.seq || '—') + ' |\n'
    md += '| 状态 | ' + statusName(sim.status) + ' |\n'
    md += '| 仿真软件 | ' + (rec ? formatSoftware(rec.software) : '—') + ' |\n'
    md += '| 开始时间 | ' + ((sim.startTime || '').replace('T', ' ') || '—') + ' |\n'
    md += '| 截止时间 | ' + ((rec ? rec.recordTime : '') || '—').replace('T', ' ') + ' |\n'
    md += '| 仿真结果 | ' + (rec?.result || '—') + ' |\n'
    md += '| 文件位置 | ' + (rec?.fileLocation || '—') + ' |\n'
    md += '| 关联计划 | ' + (linkedPlanName(sim.linkedPlanId) || '—') + ' |\n'
    md += '| 备注 | ' + (sim.notes || '—') + ' |\n\n'
  })
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '仿真记录_' + todayStr() + '.md'; a.click()
  URL.revokeObjectURL(url)
}
function exportPdf() {
  showExportMenu.value = false
  const list = displayed.value
  if (list.length === 0) { alert('没有可导出的仿真记录'); return }
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>仿真记录</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;padding:40px;color:#1F2937;max-width:900px;margin:0 auto}' +
    'h1{font-size:26px;margin-bottom:8px}.meta{color:#9CA3AF;font-size:13px;margin-bottom:30px}' +
    'h2{font-size:17px;margin:24px 0 10px;color:#4B5563;border-bottom:1px solid #E5E7EB;padding-bottom:6px}' +
    'table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}td,th{border:1px solid #E5E7EB;padding:8px 10px;text-align:left}th{background:#F3F4F6;color:#6B7280;width:100px}</style></head><body>' +
    '<h1>仿真记录</h1><div class="meta">导出时间：' + new Date().toLocaleString() + ' &nbsp;|&nbsp; 共 ' + list.length + ' 条记录</div>'
  list.forEach((sim, i) => {
    const rec = latestRecord(sim)
    html += '<h2>' + (i + 1) + '. ' + (sim.subject || '未命名仿真') + '</h2><table>'
    html += '<tr><th>编号</th><td>' + (sim.seq || '—') + '</td></tr>'
    html += '<tr><th>状态</th><td>' + statusName(sim.status) + '</td></tr>'
    html += '<tr><th>仿真软件</th><td>' + (rec ? formatSoftware(rec.software) : '—') + '</td></tr>'
    html += '<tr><th>开始时间</th><td>' + ((sim.startTime || '').replace('T', ' ') || '—') + '</td></tr>'
    html += '<tr><th>截止时间</th><td>' + ((rec ? rec.recordTime : '') || '—').replace('T', ' ') + '</td></tr>'
    html += '<tr><th>仿真结果</th><td>' + (rec?.result || '—') + '</td></tr>'
    html += '<tr><th>文件位置</th><td>' + (rec?.fileLocation || '—') + '</td></tr>'
    html += '<tr><th>关联计划</th><td>' + (linkedPlanName(sim.linkedPlanId) || '—') + '</td></tr>'
    html += '<tr><th>备注</th><td>' + (sim.notes || '—') + '</td></tr>'
    html += '</table>'
  })
  html += '</body></html>'
  printHtml(html)
}

const emptyForm = () => ({
  code: '', subject: '', startTime: '', status: 'pending', linkedPlanId: '', notes: '',
})
const form = ref(emptyForm())

// 仿真记录表单
const showRecordForm = ref(false)
const editingRecord = ref(null)
const emptyRecordForm = () => ({
  software: [], detail: '', recordTime: '', result: '', fileLocation: '', reason: '',
  images: [],       // 本次会话新增/保留的图片 [{ key, name, url, fileName? }]
  resultImages: [], // 已保存到存储的文件名（读编辑时回填）
  removedImages: [],// 编辑时被用户移除、需删除的旧文件名
})
const recordForm = ref(emptyRecordForm())
// 图片上传
const imgFilesInput = ref(null)
const previewImgUrl = ref('')
const simImgDirName = ref('')

// 仿真记录评价标签弹窗
const recordEvalPopupId = ref(null)
const recordEvalPopupStyle = ref({})

const chartRef = ref(null)
let chartInstance = null

const planOptions = computed(() => planStore.plans.map(p => ({ id: p.id, title: p.title })))

// 内置 + 自定义 软件选项
const allSoftware = computed(() => [
  ...SIM_SOFTWARE_OPTIONS.map(s => ({ ...s, custom: false })),
  ...simStore.customSoftware.map(s => ({ ...s, custom: true })),
])

// 编辑历史（最新在上）已弃用，详情改为显示 records 列表

const displayed = computed(() => {
  let list = (Array.isArray(simStore.simulations) ? simStore.simulations : []).filter(s => s && typeof s === 'object')
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    if (searchField.value === 'time') {
      list = list.filter(s => (s.startTime || '').toLowerCase().includes(q))
    } else {
      // 软件搜索：检查该仿真下任意 record 的 software
      list = list.filter(s => {
        const records = Array.isArray(s.records) ? s.records : []
        for (const r of records) {
          const swList = Array.isArray(r.software) ? r.software : []
          for (const swId of swList) {
            const found = allSoftware.value.find(x => x.id === swId)
            if (found && found.name.toLowerCase().includes(q)) return true
          }
        }
        return false
      })
    }
  }
  const statusOrder = simStore.statusOptions.map(s => s.id)
  list.sort((a, b) => {
    let av, bv
    if (sortBy.value === 'status') {
      av = statusOrder.indexOf(a.status); bv = statusOrder.indexOf(b.status)
    } else {
      av = a.startTime || ''; bv = b.startTime || ''
    }
    if (av < bv) return sortDir.value === 'asc' ? -1 : 1
    if (av > bv) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return list
})

function statusName(id) { return (simStore.statusOptions.find(s => s.id === id) || {}).name || id }
function statusBadgeStyle(id) {
  const c = (simStore.statusOptions.find(s => s.id === id) || {}).color || '#9CA3AF'
  return { background: c + '20', color: c }
}

// ===== 自定义软件 =====
function startCustomSw() {
  showCustomSw.value = true
  customSwName.value = ''
  nextTick(() => { if (customSwInput.value) customSwInput.value.focus() })
}
function confirmCustomSw() {
  const name = customSwName.value.trim()
  if (!name) { showCustomSw.value = false; return }
  const item = simStore.addCustomSoftware(name)
  if (item && !form.value.software.includes(item.id)) form.value.software.push(item.id)
  customSwName.value = ''
  showCustomSw.value = false
}
function cancelCustomSw() { showCustomSw.value = false; customSwName.value = '' }
function removeCustomSw(sw) {
  if (!confirm('删除自定义软件「' + sw.name + '」？（已选中的仿真记录不受影响）')) return
  simStore.removeCustomSoftware(sw.id)
  form.value.software = form.value.software.filter(id => id !== sw.id)
}
function linkedPlanName(id) {
  if (!id) return ''
  const p = planStore.plans.find(x => x.id === id)
  return p ? (p.title || '未命名计划') : ''
}
function latestRecord(sim) {
  if (!sim || !Array.isArray(sim.records) || !sim.records.length) return null
  return sim.records[sim.records.length - 1]
}
function formatSoftware(sw) {
  if (!sw || !Array.isArray(sw) || sw.length === 0) return '—'
  return sw.map(id => {
    const found = allSoftware.value.find(s => s.id === id)
    return found ? found.name : id
  }).join('、')
}
function formatSoftwareList(sw) {
  if (!sw || !Array.isArray(sw) || sw.length === 0) return []
  return sw.map(id => {
    const found = allSoftware.value.find(s => s.id === id)
    return found ? found.name : id
  })
}
function toggleSortDir() { sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc' }

function openAdd() {
  editingSim.value = null
  form.value = emptyForm()
  form.value.code = simStore.genCode(simStore.nextSeq)
  showForm.value = true
}
function openEdit(sim) {
  editingSim.value = sim
  // 编辑仿真 = 修改"初始信息"，records 字段不动
  form.value = {
    code: sim.code || '', subject: sim.subject || '', startTime: sim.startTime || '',
    status: sim.status || 'pending', linkedPlanId: sim.linkedPlanId || '', notes: sim.notes || '',
  }
  showForm.value = true
}
function closeForm() { showForm.value = false; editingSim.value = null; showCustomSw.value = false; customSwName.value = '' }
// 遮罩点击关闭：改为「按下 + 松开都发生在遮罩上」才关闭，避免在输入框内拖选文本松手到空白处时误关弹窗
let formMaskDowned = false
function onFormMaskDown() { formMaskDowned = true }
function onFormMaskUp() {
  if (!formMaskDowned) return
  formMaskDowned = false
  closeForm()
}
function saveForm() {
  if (!form.value.subject.trim()) { alert('请填写仿真主题'); return }
  if (editingSim.value) {
    simStore.updateSimulation(editingSim.value.id, { ...form.value })
  } else {
    simStore.addSimulation({ ...form.value })
  }
  closeForm()
}
function confirmDelete(sim) {
  if (confirm('确定删除仿真「' + (sim.subject || '未命名仿真') + '」吗？该仿真下所有记录也会一并删除。')) {
    simStore.deleteSimulation(sim.id)
  }
}
function deleteCurrent() {
  if (editingSim.value && confirm('确定删除该仿真吗？')) {
    simStore.deleteSimulation(editingSim.value.id)
    closeForm()
  }
}
function openDetail(sim) {
  // 拉取最新引用，避免响应滞后
  const latest = simStore.simulations.find(s => s.id === sim.id) || sim
  detailSim.value = latest
  showDetail.value = true
}
function closeDetail() { showDetail.value = false }

// ===== 仿真记录 =====
// 记录打开时的表单快照，用于检测是否有未保存的修改
let recordFormSnapshot = ''
function snapshotRecordForm() {
  recordFormSnapshot = JSON.stringify(recordForm.value)
}
function recordFormDirty() {
  return recordFormSnapshot !== '' && JSON.stringify(recordForm.value) !== recordFormSnapshot
}
function openAddRecord() {
  editingRecord.value = null
  recordForm.value = emptyRecordForm()
  showCustomSw.value = false
  customSwName.value = ''
  showRecordForm.value = true
  snapshotRecordForm()
}
function openEditRecord(r) {
  editingRecord.value = r
  recordForm.value = {
    software: Array.isArray(r.software) ? [...r.software] : [],
    detail: r.detail || '',
    recordTime: r.recordTime || '',
    result: r.result || '',
    fileLocation: r.fileLocation || '',
    reason: r.reason || '',
    // 编辑时回填已保存图片（占位展示，保存时若无 file 则保留原名）
    images: (Array.isArray(r.resultImages) ? r.resultImages : []).map(name => ({
      key: 'img_keep_' + name, name, fileName: name, file: null, url: '', _blobUrl: false, _loading: true,
    })),
    resultImages: Array.isArray(r.resultImages) ? [...r.resultImages] : [],
    removedImages: [],
  }
  showCustomSw.value = false
  customSwName.value = ''
  showRecordForm.value = true
  snapshotRecordForm()
  // 异步加载已保存图片的预览 URL
  ;(Array.isArray(r.resultImages) ? r.resultImages : []).forEach(name => {
    openSimImage(name).then(u => {
      const img = recordForm.value.images.find(x => x.fileName === name)
      if (img) { img.url = u; img._loading = false }
    }).catch(() => {})
  })
}
function closeRecordForm(force = false) {
  // 有未保存的修改时，若未传 force（如通过遮罩误触路径），先询问，避免误点空白处导致数据丢失
  if (!force && recordFormDirty() && !confirm('当前输入尚未保存，确定要关闭吗？')) return
  // 释放本次会话生成的 Blob URL
  if (Array.isArray(recordForm.value.images)) {
    recordForm.value.images.forEach(img => { if (img.url && img._blobUrl) URL.revokeObjectURL(img.url) })
  }
  showRecordForm.value = false
  editingRecord.value = null
  showCustomSw.value = false
  customSwName.value = ''
  recordFormSnapshot = ''
}
// 遮罩点击关闭：改为「按下 + 松开都发生在遮罩上」才关闭——修复拖选文本时鼠标移到空白处松手导致误关的问题；
// 若仿真详情等文本字段已输入未保存，单击空白处也不关闭（避免误操作丢失内容），只有 × 按钮可关闭
let recordMaskDowned = false
function onRecordMaskDown() { recordMaskDowned = true }
function onRecordMaskUp() {
  if (!recordMaskDowned) return
  recordMaskDowned = false
  if (recordFormDirty()) return
  closeRecordForm(true)
}
function saveRecord() {
  if (!detailSim.value || !detailSim.value.id) { closeRecordForm(true); return }
  saveRecordInner()
}
async function saveRecordInner() {
  // 1) 先落盘新增的图片，得到文件名
  const savedNames = []
  for (const img of recordForm.value.images) {
    if (!img.file) continue // 已保存图片（编辑场景回填时 file 为空，保留原名）
    try {
      const name = await saveSimImage(img.file)
      savedNames.push(name)
    } catch (e) {
      console.warn('[Simulation] 保存结果图片失败:', e)
      alert('图片「' + (img.name || '') + '」保存失败，已跳过')
    }
  }
  // 2) 最终文件名 = 编辑时保留的旧图 + 新落盘的图
  const finalImages = [
    ...(Array.isArray(recordForm.value.resultImages) ? recordForm.value.resultImages : []),
    ...savedNames,
  ]
  // 3) 用户移除的旧图：从存储删除
  if (Array.isArray(recordForm.value.removedImages) && recordForm.value.removedImages.length) {
    deleteSimImages(recordForm.value.removedImages)
  }
  const payload = {
    software: [...recordForm.value.software],
    detail: recordForm.value.detail,
    recordTime: recordForm.value.recordTime,
    result: recordForm.value.result,
    fileLocation: recordForm.value.fileLocation,
    reason: recordForm.value.reason,
    resultImages: finalImages,
  }
  if (editingRecord.value) {
    simStore.updateSimulationRecord(detailSim.value.id, editingRecord.value.id, payload)
  } else {
    simStore.addSimulationRecord(detailSim.value.id, payload)
  }
  // 刷新 detailSim 引用，触发响应
  const latest = simStore.simulations.find(s => s.id === detailSim.value.id)
  if (latest) detailSim.value = latest
  closeRecordForm(true)
}
function deleteRecord(r) {
  if (!detailSim.value) return
  if (!confirm('确定删除该仿真记录吗？')) return
  // 同步清理该记录关联的结果图片
  if (Array.isArray(r.resultImages) && r.resultImages.length) {
    deleteSimImages(r.resultImages)
  }
  simStore.deleteSimulationRecord(detailSim.value.id, r.id)
  const latest = simStore.simulations.find(s => s.id === detailSim.value.id)
  if (latest) detailSim.value = latest
}

// ===== 仿真结果图片上传 / 预览 =====
let simImgSeq = 0
function triggerImgInput() { imgFilesInput.value?.click() }
async function onImgFilesChange(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return
  for (const file of files) {
    // 客户端类型校验（仅提示，不强制；Tauri 端大小不限）
    if (!/^image\//.test(file.type)) { alert('「' + file.name + '」不是图片文件，已跳过'); continue }
    const url = URL.createObjectURL(file)
    recordForm.value.images.push({ key: 'img_' + (++simImgSeq) + '_' + Date.now(), name: file.name, file, url, _blobUrl: true })
  }
}
function removeImg(i) {
  const img = recordForm.value.images[i]
  if (!img) return
  // 若是编辑回填的旧图（无 file，表示已保存），标记为待删除
  if (!img.file && img.fileName) {
    recordForm.value.removedImages.push(img.fileName)
    recordForm.value.resultImages = recordForm.value.resultImages.filter(n => n !== img.fileName)
  }
  if (img._blobUrl) URL.revokeObjectURL(img.url)
  recordForm.value.images.splice(i, 1)
}
function recordImgUrl(name) {
  // 详情展示：异步加载图片 URL
  const url = simImgCache.value[name]
  if (url) return url
  openSimImage(name).then(u => { if (u) simImgCache.value[name] = u }).catch(() => {})
  return ''
}
const simImgCache = ref({})
function previewSimImg(name) {
  const url = simImgCache.value[name]
  if (url) previewImgUrl.value = url
}
function closeImgPreview() { previewImgUrl.value = '' }

// ===== 仿真记录评价标签（保留/舍弃/暂定） =====
function recordEvalLabel(v) {
  if (v === 'keep') return '保留'
  if (v === 'discard') return '舍弃'
  if (v === 'pending') return '暂定'
  return '标注'
}
function recordEvalTitle(v) {
  if (v === 'keep') return '评价：保留（单击可修改）'
  if (v === 'discard') return '评价：舍弃（单击可修改）'
  if (v === 'pending') return '评价：暂定（单击可修改）'
  return '单击为此仿真记录添加评价标签'
}
function recordEvalClass(v) {
  if (v === 'keep') return 'eval-keep'
  if (v === 'discard') return 'eval-discard'
  if (v === 'pending') return 'eval-pending'
  return ''
}
function toggleRecordEvalPopup(r, event) {
  if (recordEvalPopupId.value === r.id) {
    recordEvalPopupId.value = null
    return
  }
  const btn = event?.target?.closest?.('.record-eval-btn') || event?.target
  if (btn) {
    const rect = btn.getBoundingClientRect()
    recordEvalPopupStyle.value = {
      position: 'fixed',
      top: (rect.bottom + 4) + 'px',
      left: Math.min(Math.max(8, rect.left), window.innerWidth - 200) + 'px',
      zIndex: 300,
    }
  }
  recordEvalPopupId.value = r.id
}
function setRecordEval(r, val) {
  if (!detailSim.value || !r || !r.id) { recordEvalPopupId.value = null; return }
  simStore.updateSimulationRecord(detailSim.value.id, r.id, { evaluation: val })
  const latest = simStore.simulations.find(s => s.id === detailSim.value.id)
  if (latest) detailSim.value = latest
  recordEvalPopupId.value = null
}
// 点击评价弹窗外部时自动关闭
function closeRecordEvalPopup(e) {
  if (!recordEvalPopupId.value) return
  if (!e.target.closest('.record-eval-popup') && !e.target.closest('.record-eval-btn')) {
    recordEvalPopupId.value = null
  }
}
function removeCustomSwFromRecord(sw) {
  if (!confirm('删除自定义软件「' + sw.name + '」？')) return
  simStore.removeCustomSoftware(sw.id)
  recordForm.value.software = recordForm.value.software.filter(id => id !== sw.id)
}
function goToPlan() { closeDetail(); router.push('/plan') }

// ===== 环形图 =====
function renderChart() {
  if (!chartInstance) return
  const counts = simStore.statusCounts
  const data = simStore.statusOptions.map(s => ({ name: s.name, value: counts[s.id], itemStyle: { color: s.color } }))
  chartInstance.setOption({
    textStyle: { color: '#6B7280' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} 项 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: '#6B7280' } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '45%'],
      avoidLabelOverlap: false, label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#1F2937' } },
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

watch(activeTab, async (val) => { if (val === 'overview') { await nextTick(); initChart() } })
watch(() => simStore.simulations, () => { if (activeTab.value === 'overview') nextTick(() => renderChart()) }, { deep: true })

// 选择自定义图片存放目录
async function changeSimImgDir() {
  try {
    const info = await selectSimImgDir()
    simImgDirName.value = info.active ? info.name : ''
  } catch (e) {
    console.warn('[Simulation] 选择图片目录失败:', e)
  }
}
// 恢复默认图片存放目录
async function resetSimImgDir() {
  try {
    const info = await unbindSimImgDir()
    simImgDirName.value = info.active ? info.name : ''
  } catch (e) {
    console.warn('[Simulation] 恢复默认目录失败:', e)
  }
}

onMounted(() => {
  if (activeTab.value === 'overview') nextTick(() => initChart())
  document.addEventListener('click', closeRecordEvalPopup)
  document.addEventListener('click', handleClickOutside)
  // 初始化仿真结果图片存储目录（Tauri 桌面端自动落盘「默认数据目录/仿真结果」）
  initSimImgDir().then(() => {
    const info = getSimImgDirInfo()
    simImgDirName.value = info.active ? info.name : ''
  }).catch(() => {})
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeRecordEvalPopup)
  document.removeEventListener('click', handleClickOutside)
})

// 点击导出下拉菜单外区域自动关闭
function handleClickOutside(e) {
  if (showExportMenu.value && !e.target.closest('.export-dropdown')) {
    showExportMenu.value = false
  }
}
</script>

<style scoped>
.sim-page { max-width: 100%; padding: 0 4px; }
.tab-bar { display: flex; justify-content: center; margin-bottom: 20px; }
.tab-pill { display: inline-flex; background: var(--color-bg); border: 1px solid var(--color-border-light); border-radius: var(--radius-full); padding: 4px; gap: 4px; }
.tab-btn {
  padding: 8px 32px; border: none; background: transparent; color: var(--color-text-secondary);
  border-radius: var(--radius-full); cursor: pointer; font-size: 14px; font-weight: 500;
  transition: all var(--transition-fast); min-width: 120px; text-align: center;
}
.tab-btn:hover { color: var(--color-text-primary); background: rgba(0,0,0,0.03); }
.tab-btn.active { color: #fff; background: var(--color-primary); box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25); }
.tab-content { animation: fade .2s; }
@keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }
.modal-overlay { background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(6px); }

.stat-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card {
  flex: 1; min-width: 140px; background: var(--color-bg-card); border: 1px solid var(--color-border-light);
  border-top: 3px solid var(--color-border); border-radius: var(--radius-md); padding: 16px 18px;
  text-align: center;
}
.stat-num { font-size: 30px; font-weight: 800; font-family: Arial, sans-serif; line-height: 1.1; }
.stat-label { font-size: 13px; color: var(--color-text-secondary); margin-top: 6px; text-align: center; }

.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.sim-card { background: var(--color-bg-card); border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 16px; }
.card-title { font-size: 15px; font-weight: 600; margin: 0 0 12px; color: var(--color-text-primary); }
.section-card { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-header .card-title { margin: 0; font-size: 16px; }
.card-header-actions { display: flex; gap: 8px; align-items: center; }
.sim-chart { width: 100%; height: 260px; }
.recent-list { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }
.recent-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--radius-sm, 6px);
  background: var(--color-bg); cursor: pointer; border: 1px solid var(--color-border-light);
}
.recent-item:hover { background: var(--color-bg-hover); }
.recent-seq { font-size: 12px; color: var(--color-text-tertiary); font-family: var(--font-mono); min-width: 24px; }
.recent-subject { flex: 1; font-size: 13px; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-time { font-size: 12px; color: var(--color-text-tertiary); }
.empty-hint { color: var(--color-text-tertiary); font-size: 13px; padding: 12px 0; text-align: center; }

.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.toolbar-spacer { flex: 1; }
.filter-select { padding: 6px 8px; }
.filter-search { padding: 6px 10px; }
.sort-label { font-size: 13px; color: var(--color-text-secondary); }
.sort-dir-btn { min-width: 76px; }

/* 仿真库头部按钮（简笔画图标 + 文字） */
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

/* 仿真库配置弹窗 2x2 网格 */
.config-modal { max-width: 760px; }
.cfg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.cfg-group { border: 1px solid var(--color-border-light); border-radius: var(--radius-lg); padding: 14px; background: var(--color-bg); }
.cfg-group-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--color-text-primary); }
.cfg-group-title svg { color: var(--color-primary); flex-shrink: 0; }
.cfg-list { display: flex; flex-direction: column; gap: 8px; }
.cfg-item { display: flex; align-items: center; gap: 6px; }
.cfg-item input[type="checkbox"] { accent-color: var(--color-primary); }
.cfg-color { width: 24px; height: 24px; padding: 0; border: none; border-radius: 4px; cursor: pointer; background: none; }
.cfg-name { flex: 1; padding: 5px 8px; font-size: 13px; }
.cfg-col-label { flex: 1; font-size: 13px; color: var(--color-text-primary); }
.cfg-tag { font-size: 11px; padding: 1px 6px; border-radius: 999px; background: var(--color-bg-hover); color: var(--color-text-tertiary); }
.soft-btn-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: 1px solid var(--color-border-light); border-radius: 6px;
  background: var(--color-bg); color: var(--color-text-secondary); cursor: pointer; font-size: 13px;
}
.soft-btn-icon:hover:not(:disabled) { background: var(--color-bg-hover); color: var(--color-text-primary); }
.soft-btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }
.soft-btn-icon.danger { color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 25%, var(--color-border-light)); }
.soft-btn-icon.danger:hover { background: color-mix(in srgb, var(--color-danger) 10%, var(--color-bg)); }
.soft-btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  padding: 5px 10px; border: 1px dashed var(--color-border); border-radius: var(--radius-sm);
  background: transparent; color: var(--color-text-secondary); cursor: pointer; font-size: 13px;
}
.soft-btn-ghost:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }

.sim-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sim-table th {
  text-align: center; padding: 10px 12px; color: var(--color-text-secondary); font-weight: 600;
  border-bottom: 2px solid var(--color-border); background: var(--color-bg);
}
.sim-table td { padding: 10px 12px; border-bottom: 1px solid var(--color-border-light); color: var(--color-text-primary); vertical-align: middle; text-align: center; }
.sim-table tbody tr { cursor: pointer; }
.sim-table tbody tr:hover { background: var(--color-bg-hover); }
.col-seq { width: 64px; color: var(--color-text-tertiary); font-family: var(--font-mono); }
.col-status { width: 96px; }
.col-time { width: 170px; color: var(--color-text-secondary); }
.col-op { width: 110px; }
.cell-subject { font-weight: 500; }
.cell-result { color: var(--color-text-secondary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-text { color: var(--color-text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.op-wrap { display: flex; align-items: center; justify-content: center; gap: 6px; }

/* 统一「浅色底」操作按钮 */
.soft-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  padding: 5px 8px; border: 1px solid var(--color-border-light); border-radius: var(--radius-sm, 6px);
  background: var(--color-bg); color: var(--color-text-secondary); cursor: pointer;
  font-size: 13px; line-height: 1; transition: all var(--transition-fast, .15s);
}
.soft-btn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); border-color: var(--color-border); }
.soft-btn-text { padding: 6px 12px; font-weight: 500; }
.soft-btn-mini { padding: 3px 9px; font-size: 12px; }
.soft-btn-primary { color: var(--color-primary); }
.soft-btn-primary:hover { color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg)); border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border-light)); }
.soft-btn-danger { color: var(--color-danger); }
.soft-btn-danger:hover { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 10%, var(--color-bg)); border-color: color-mix(in srgb, var(--color-danger) 35%, var(--color-border-light)); }
.soft-btn-close { padding: 6px 8px; }
.soft-btn-close:hover { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 10%, var(--color-bg)); }

/* 仿真记录评价标签（与 soft-btn 同风格） */
.record-eval-btn { padding: 5px 9px; border-radius: 999px; font-size: 12px; flex-shrink: 0; }
.record-eval-btn.eval-keep { background: #22C55E; border-color: #22C55E; color: #fff; }
.record-eval-btn.eval-keep:hover { background: #16A34A; color: #fff; }
.record-eval-btn.eval-discard { background: #111827; border-color: #111827; color: #fff; }
.record-eval-btn.eval-discard:hover { background: #000; color: #fff; }
.record-eval-btn.eval-pending { background: #F59E0B; border-color: #F59E0B; color: #fff; }
.record-eval-btn.eval-pending:hover { background: #D97706; color: #fff; }
/* 评价选项弹出层 */
.record-eval-popup {
  position: fixed; z-index: 300; min-width: 168px;
  background: rgba(255, 255, 255, 0.92); border: 1px solid var(--color-border-light);
  border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16); padding: 8px;
  display: flex; flex-direction: column; gap: 6px;
}
.record-eval-popup-title { font-size: 12px; color: var(--color-text-tertiary); padding: 2px 6px 4px; }
.record-eval-option {
  display: flex; align-items: center; gap: 6px; width: 100%; text-align: left;
  padding: 7px 10px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer;
  color: #fff; transition: opacity .15s;
}
.record-eval-option:hover { opacity: .88; }
.record-eval-option.eval-keep { background: #22C55E; }
.record-eval-option.eval-discard { background: #111827; }
.record-eval-option.eval-pending { background: #F59E0B; }
.record-eval-option.eval-clear { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border-light); }
.record-eval-option.eval-clear:hover { background: var(--color-bg-hover); opacity: 1; }
.empty-cell { text-align: center; color: var(--color-text-tertiary); padding: 40px; }
.status-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }

.sim-modal {
  max-width: 720px; width: 92%; max-height: 88vh; overflow-y: auto;
  background: var(--color-bg-card, #fff); border-radius: var(--radius-xl, 16px);
  box-shadow: var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.25)); padding: 24px 28px;
}
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
.form-field { display: flex; flex-direction: column; }
.form-field.span-2 { grid-column: 1 / -1; }
.form-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 4px; }
.form-label .hint { font-weight: 400; color: var(--color-text-tertiary); font-size: 12px; }
.chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-check {
  padding: 5px 12px; border: 1px solid var(--color-border-light); border-radius: 999px; cursor: pointer;
  font-size: 13px; color: var(--color-text-secondary); background: var(--color-bg); user-select: none;
}
.chip-check.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.chip-check { display: inline-flex; align-items: center; gap: 6px; }
.chip-del { font-size: 14px; line-height: 1; opacity: .55; cursor: pointer; }
.chip-del:hover { opacity: 1; }
.custom-sw-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.custom-sw-row .input { flex: 1; }
.label-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }

.modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.modal-title { font-size: 16px; font-weight: 600; margin: 0; color: var(--color-text-primary); }
.modal-head-actions { display: flex; align-items: center; gap: 8px; }

.modal-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; }
.modal-actions-right { display: flex; gap: 10px; margin-left: auto; }

.detail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }

/* 前世今生 时间线 */
.history-section { margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--color-border); }
.history-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.history-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.history-count { font-size: 12px; color: var(--color-text-tertiary); }
.timeline { display: flex; flex-direction: column; position: relative; padding-left: 14px; max-height: 260px; overflow-y: auto; }
.timeline::before { content: ''; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 1px; background: var(--color-border); }
.tl-item { position: relative; padding: 0 0 12px 12px; }
.tl-dot { position: absolute; left: -13px; top: 5px; width: 9px; height: 9px; border-radius: 50%; background: var(--color-primary); border: 2px solid var(--color-bg-card, #fff); }
.tl-item.create .tl-dot { background: #22C55E; }
.tl-top { display: flex; align-items: center; gap: 8px; }
.tl-tag { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--color-primary) 14%, transparent); color: var(--color-primary); }
.tl-tag.create { background: rgba(34,197,94,.14); color: #16A34A; }
.tl-time { font-size: 12px; color: var(--color-text-tertiary); font-family: var(--font-mono); }
.tl-summary { font-size: 13px; color: var(--color-text-primary); margin-top: 3px; }
.tl-changes { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
.tl-change { display: flex; align-items: baseline; gap: 6px; font-size: 12px; flex-wrap: wrap; background: var(--color-bg); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm, 6px); padding: 4px 8px; }
.tl-field { color: var(--color-text-secondary); font-weight: 600; }
.tl-from { color: var(--color-text-tertiary); text-decoration: line-through; word-break: break-all; }
.tl-arrow { color: var(--color-text-tertiary); }
.tl-to { color: var(--color-text-primary); word-break: break-all; }
.detail-body { display: flex; flex-direction: column; gap: 10px; }
.detail-row { display: flex; gap: 12px; font-size: 13px; }
.detail-key { width: 84px; flex-shrink: 0; color: var(--color-text-tertiary); }
.detail-val { flex: 1; color: var(--color-text-primary); word-break: break-all; }

/* 详情分组 */
.detail-section { margin-bottom: 16px; }
.detail-section + .detail-section { padding-top: 14px; border-top: 1px dashed var(--color-border); }
.section-title {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 14px; font-weight: 600; color: var(--color-text-primary);
  margin-bottom: 10px;
}
.section-count { font-size: 12px; font-weight: 500; color: var(--color-text-tertiary); }

/* 仿真记录卡片 */
.records-list { display: flex; flex-direction: column; gap: 12px; padding-right: 4px; }
.record-card {
  background: transparent;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md, 10px);
  padding: 0;
  overflow: hidden;
}
.record-card-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  background: var(--color-bg-card, #fff);
  border-bottom: 1px solid var(--color-border-light);
}
.record-no-badge {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--color-primary); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.record-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.record-time { font-size: 12px; color: var(--color-text-tertiary); font-family: var(--font-mono); }
.record-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 0; }
.record-reason {
  flex: 1; min-width: 0;
  margin-right: auto;
  display: flex; align-items: center;
  padding: 4px 10px;
  margin-left: 4px;
  border-radius: var(--radius-sm, 6px);
  background: var(--color-bg);
  border: 1px dashed var(--color-border-light);
  font-size: 12px;
  color: var(--color-text-tertiary);
  overflow: hidden;
  cursor: default;
}
.record-reason-text {
  display: inline-block; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--color-text-secondary);
}
.record-reason-empty {
  color: var(--color-text-quaternary, #9ca3af);
  font-style: italic;
}
.record-card-body { padding: 12px 16px 14px; display: flex; flex-direction: column; gap: 12px; }
.record-block { display: flex; flex-direction: column; gap: 6px; }
.record-block-label {
  font-size: 12px; font-weight: 600; color: var(--color-text-secondary);
  display: flex; align-items: center; gap: 4px;
}
.record-block-content { font-size: 13px; color: var(--color-text-primary); word-break: break-all; }
.record-block-mono { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-secondary); }
.record-block-text {
  white-space: pre-wrap;
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm, 6px);
  padding: 8px 10px;
  line-height: 1.55;
}
.record-block-result { position: relative; }
.record-block-result .record-block-content {
  font-size: 14px; font-weight: 500;
  white-space: pre-wrap;
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-card, #fff)), color-mix(in srgb, var(--color-primary) 4%, var(--color-bg-card, #fff)));
  border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border-light));
  border-radius: var(--radius-sm, 6px);
  padding: 10px 12px;
  color: var(--color-text-primary);
}
.record-empty { color: var(--color-text-tertiary); font-size: 12px; font-style: italic; }
.record-software-list { display: flex; flex-wrap: wrap; gap: 6px; }
.record-software-chip {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 999px;
  background: var(--color-bg-card, #fff);
  border: 1px solid var(--color-border);
  font-size: 12px; color: var(--color-text-primary);
  font-family: var(--font-mono);
}

/* ===== 仿真结果图片 ===== */
.sim-img-upload {
  margin-top: 8px;
  border: 1px dashed var(--color-border-light);
  border-radius: var(--radius-sm, 8px);
  padding: 10px 12px;
  background: var(--color-bg, #fafafa);
}
.sim-img-upload-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.sim-img-upload-tip { font-size: 12px; color: var(--color-text-secondary); display: flex; align-items: center; gap: 5px; }
.sim-img-list { display: flex; flex-wrap: wrap; gap: 10px; }
.sim-img-item {
  position: relative; width: 88px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.sim-img-thumb {
  width: 88px; height: 88px; object-fit: cover;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--color-border-light);
  background: #fff;
  display: block;
}
.sim-img-del {
  position: absolute; top: -7px; right: -7px;
  width: 20px; height: 20px; border-radius: 50%;
  border: none; cursor: pointer;
  background: var(--color-danger, #ef4444); color: #fff;
  font-size: 11px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,.25);
}
.sim-img-name {
  font-size: 11px; color: var(--color-text-tertiary);
  max-width: 88px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sim-img-empty { font-size: 12px; color: var(--color-text-quaternary, #9ca3af); font-style: italic; }
.sim-img-location { margin-top: 6px; font-size: 12px; color: var(--color-text-tertiary); display: flex; align-items: center; gap: 5px; word-break: break-all; flex-wrap: wrap; }
.sim-img-loc-btn { border: 1px solid var(--color-border-light); background: var(--color-bg); color: var(--color-text-secondary); border-radius: 4px; padding: 1px 8px; font-size: 11px; cursor: pointer; transition: all .15s; }
.sim-img-loc-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

/* 详情卡片中的结果图片 */
.record-img-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.record-img-item { cursor: zoom-in; }
.record-img-thumb {
  width: 96px; height: 96px; object-fit: cover;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-card, #fff);
  transition: transform .15s;
}
.record-img-thumb:hover { transform: scale(1.05); box-shadow: var(--shadow-sm); }

/* 图片放大预览 */
.img-preview-overlay { z-index: 400; display: flex; align-items: center; justify-content: center; }
.img-preview-box { position: relative; max-width: 92vw; max-height: 88vh; background: #fff; border-radius: 10px; padding: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.35); }
.img-preview-main { max-width: 90vw; max-height: 82vh; object-fit: contain; border-radius: 6px; display: block; }
.img-preview-close {
  position: absolute; top: -10px; right: -10px;
  width: 26px; height: 26px; border-radius: 50%;
  border: none; cursor: pointer;
  background: var(--color-danger, #ef4444); color: #fff;
  font-size: 13px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
}

/* ===== 响应式：两栏布局在窄屏堆叠为单列 ===== */
@media (max-width: 760px) {
  .overview-grid { grid-template-columns: 1fr; }
  .cfg-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
