<template>
  <div class="research-page">
    <div class="tab-bar">
      <div class="tab-pill">
        <button v-for="tab in tabs" :key="tab.id" class="tab-btn"
          :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          {{ tab.name }}
        </button>
      </div>
    </div>

    <!-- 论文管理 -->
    <div v-if="activeTab === 'papers'" class="tab-content">
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title">论文稿件全生命周期管理</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="openStatusModal" title="论文状态配置">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              论文状态
            </button>
            <div class="export-dropdown">
              <button class="header-btn" @click="toggleExportMenu('papers')" title="导出">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出
              </button>
              <div v-if="exportMenus.papers" class="export-menu" @click.stop>
                <button @click="exportPapersMarkdown"><AppIcon name="file-edit" />  导出 Markdown</button>
                <button @click="exportPapersPdf"><AppIcon name="file-text" />  导出 PDF</button>
              </div>
            </div>
            <button class="header-btn header-btn-primary" @click="showAddPaper = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加论文
            </button>
          </div>
        </div>
        <div class="paper-list">
          <div v-for="paper in papersStore.papers" :key="paper.id" class="paper-item card-hover">
            <div class="paper-main" @click="openDetailPaper(paper)" title="点击查看论文前世今生">
              <div class="paper-title">{{ paper.title }}</div>
              <div class="paper-meta">
                <span v-if="statusDateOf(paper)" class="meta-item status-date"><AppIcon name="calendar" />  {{ statusName(paper.status) }}: {{ statusDateOf(paper) }}</span>
                <span v-if="paper.journal" class="meta-item"><AppIcon name="book-open" />  {{ paper.journal }}</span>
                <span v-if="paper.doi" class="meta-item">DOI: {{ paper.doi }}</span>
                <span v-if="paper.deadline" class="meta-item deadline" :class="{ urgent: isUrgent(paper.deadline) }">
                  <AppIcon name="clock" />  截止: {{ paper.deadline }} ({{ deadlineCountdown(paper.deadline) }})
                </span>
              </div>
            </div>
            <div class="paper-status-area">
              <GlassSelect
                :model-value="paper.status"
                @change="updatePaperStatus(paper, $event)"
                select-class="status-select"
                :options="papersStore.statuses.map(s => ({ value: s.id, label: s.name }))"
              />
              <div class="status-timeline-mini">
                <div v-for="(s, i) in papersStore.statuses" :key="s.id" class="timeline-dot"
                  :class="{ done: s.order <= getCurrentStatusOrder(paper), current: s.id === paper.status }"
                  :style="{ background: s.order <= getCurrentStatusOrder(paper) ? s.color : '' }">
                </div>
              </div>
            </div>
            <div class="paper-actions">
              <button class="btn btn-sm btn-ghost" @click="openEditPaper(paper)" title="编辑">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-sm btn-ghost" @click="deletePaperConfirm(paper)" title="删除" style="color:var(--color-danger);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div v-if="papersStore.papers.length === 0" class="empty-state">
            <div class="empty-state-icon"><AppIcon name="file-text" /> </div>
            <p>还没有论文记录，添加第一篇吧！</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 研究助手 -->
    <div v-if="activeTab === 'assistant'" class="tab-content">
      <div class="assistant-grid">
        <!-- A. 选题收窄向导 -->
        <div class="card section-card assistant-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="target" />  选题收窄向导</h2>
          </div>
          <p class="assistant-desc">用 4 个要素把模糊想法收敛成一句话研究问题。</p>
          <div class="assistant-form">
            <input class="input" v-model="assistant.topic.object" placeholder="研究对象（如：网约车司机）" />
            <input class="input" v-model="assistant.topic.variable" placeholder="核心变量（如：平台算法感知）" />
            <input class="input" v-model="assistant.topic.data" placeholder="数据来源 / 方法（如：问卷+访谈）" />
            <input class="input" v-model="assistant.topic.contribution" placeholder="预期贡献（如：揭示工作压力机制）" />
            <button class="btn btn-primary" @click="generateResearchQuestion">生成研究问题</button>
          </div>
          <div v-if="assistant.topic.result" class="assistant-result">
            <div class="result-label">建议表述</div>
            <div class="result-text">{{ assistant.topic.result }}</div>
          </div>
        </div>

        <!-- B. 文献综述模板 -->
        <div class="card section-card assistant-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="book" />  文献综述模板</h2>
          </div>
          <p class="assistant-desc">按「主题 → 子主题 → 关键文献 → 争议点 → 研究缺口」填空。</p>
          <div class="assistant-form">
            <input class="input" v-model="assistant.review.theme" placeholder="研究主题" />
            <input class="input" v-model="assistant.review.subtheme" placeholder="子主题" />
            <input class="input" v-model="assistant.review.literature" placeholder="关键文献（作者，年份；...）" />
            <input class="input" v-model="assistant.review.debate" placeholder="争议点 / 不一致的发现" />
            <input class="input" v-model="assistant.review.gap" placeholder="研究缺口" />
            <button class="btn btn-primary" @click="generateReviewParagraph">生成综述段落</button>
          </div>
          <div v-if="assistant.review.result" class="assistant-result">
            <div class="result-label">可直接复制的综述段落</div>
            <div class="result-text">{{ assistant.review.result }}</div>
          </div>
        </div>

        <!-- C. 论文阶段流水线 -->
        <div class="card section-card assistant-card assistant-wide">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="refresh-cw" />  论文阶段流水线</h2>
            <button class="btn btn-sm btn-ghost" @click="resetStageChecklist">重置进度</button>
          </div>
          <p class="assistant-desc">每个阶段设置「必须完成项」清单，完成一项勾一项。</p>
          <div class="stage-pipeline">
            <div v-for="stage in assistant.stages" :key="stage.id" class="pipeline-stage">
              <div class="stage-header">
                <span class="stage-dot" :style="{ background: stage.color }"></span>
                <span class="stage-name">{{ stage.name }}</span>
                <span class="stage-progress">{{ stageDoneCount(stage) }}/{{ stage.items.length }}</span>
              </div>
              <div class="stage-items">
                <label v-for="(item, idx) in stage.items" :key="idx" class="stage-item">
                  <input type="checkbox" v-model="item.done" @change="saveAssistantState" />
                  <span>{{ item.text }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- D. 引用自检清单 -->
        <div class="card section-card assistant-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="check-circle" />  引用自检清单</h2>
          </div>
          <p class="assistant-desc">在提交前快速检查关键引用问题。</p>
          <div class="check-list">
            <label v-for="(check, idx) in assistant.citationChecks" :key="idx" class="check-item" :class="{ done: check.done }">
              <input type="checkbox" v-model="check.done" @change="saveAssistantState" />
              <div>
                <div class="check-title">{{ check.title }}</div>
                <input v-if="check.needsSource" class="input input-xs" v-model="check.source" placeholder="填写来源" @input="saveAssistantState" />
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 组会纪要 -->
    <div v-if="activeTab === 'meetings'" class="tab-content">
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title">组会与导师沟通纪要</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="showTemplateModal = true" title="模板配置">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              模板配置
            </button>
            <div class="export-dropdown">
              <button class="header-btn" @click="toggleExportMenu('meetings')" title="导出">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出
              </button>
              <div v-if="exportMenus.meetings" class="export-menu" @click.stop>
                <button @click="exportMeetingsMarkdown"><AppIcon name="file-edit" />  导出 Markdown</button>
                <button @click="exportMeetingsPdf"><AppIcon name="file-text" />  导出 PDF</button>
              </div>
            </div>
            <button class="header-btn header-btn-primary" @click="openAddMeeting">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              记录纪要
            </button>
          </div>
        </div>
        <div class="meeting-list">
          <div v-for="meeting in researchStore.meetings" :key="meeting.id" class="meeting-item">
            <div class="meeting-head-row">
              <div class="meeting-datetime">
                <span class="meeting-date">{{ meeting.date }}</span>
                <span v-if="meeting.timePeriod" class="meeting-time"><AppIcon name="clock" />  {{ meeting.timePeriod }}</span>
              </div>
              <div class="meeting-actions">
                <button class="btn btn-sm btn-ghost" @click="openEditMeeting(meeting)" title="编辑">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn btn-sm btn-ghost" @click="deleteMeetingConfirm(meeting)" title="删除" style="color:var(--color-danger);">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
            <div v-if="getParticipantTags(meeting).length" class="meeting-participants">
              <span class="field-label">参与人员</span>
              <div class="meeting-participant-tags">
                <span v-for="tag in getParticipantTags(meeting)" :key="tag.name" class="participant-chip" :style="{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '55' }">{{ tag.name }}</span>
              </div>
            </div>
            <div class="meeting-three">
              <div v-for="field in enabledMeetingFields" :key="field.key" class="meeting-field">
                <span class="field-label">{{ field.label }}</span>
                <p>{{ getMeetingField(meeting, field.key) || '—' }}</p>
              </div>
            </div>
          </div>
          <div v-if="researchStore.meetings.length === 0" class="empty-state">
            <div class="empty-state-icon"><AppIcon name="file-edit" /> </div>
            <p>还没有沟通纪要，记录第一次组会吧！</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 培养节点时间轴 -->
    <div v-if="activeTab === 'milestones'" class="tab-content">
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title">培养节点时间轴</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="openStageModal" title="阶段配置">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
              阶段配置
            </button>
            <div class="export-dropdown">
              <button class="header-btn" @click="toggleExportMenu('milestones')" title="导出">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出
              </button>
              <div v-if="exportMenus.milestones" class="export-menu" @click.stop>
                <button @click="exportMilestonesMarkdown"><AppIcon name="file-edit" />  导出 Markdown</button>
                <button @click="exportMilestonesPdf"><AppIcon name="file-text" />  导出 PDF</button>
              </div>
            </div>
          </div>
        </div>
        <div class="milestone-timeline">
          <div v-for="(m, i) in researchStore.milestones" :key="m.id" class="milestone-node"
            :class="m.status">
            <div class="milestone-marker">
              <span v-if="m.status === 'completed'" class="marker-check">✓</span>
              <span v-else-if="m.status === 'active'" class="marker-pulse"></span>
            </div>
            <div class="milestone-info">
              <div class="milestone-name">{{ m.name }}</div>
              <div class="milestone-date" v-if="m.date">完成于 {{ m.date }}</div>
              <div class="milestone-date" v-else-if="m.plannedDate">预计 {{ m.plannedDate }}</div>
              <div class="milestone-countdown" v-if="m.status === 'active' && m.plannedDate">
                还有 {{ daysUntil(m.plannedDate) }} 天
              </div>
            </div>
            <div class="milestone-actions">
              <button v-if="m.status !== 'completed'" class="btn btn-sm btn-primary" @click="completeMilestone(m.id)">完成</button>
              <button class="btn btn-sm btn-ghost" @click="openEditMilestone(m)" title="编辑">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加论文弹窗 -->
    <div v-if="showAddPaper" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showAddPaper = false })">
      <div class="modal-content" style="max-width: 480px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">{{ editingPaper ? '编辑论文' : '添加论文' }}</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-primary" @click="savePaper" :title="editingPaper ? '保存' : '添加'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ editingPaper ? '保存' : '添加' }}
              </button>
              <button class="soft-btn-close" @click="closePaperModal" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <input class="input" v-model="newPaper.title" placeholder="论文标题" />
            <div style="display: flex; gap: 10px;">
              <input class="input" v-model="newPaper.journal" placeholder="期刊名称" />
              <input class="input" v-model="newPaper.topic" placeholder="研究主题" />
            </div>
            <div style="display: flex; gap: 10px;">
              <input class="input" v-model="newPaper.doi" placeholder="DOI" />
              <input class="input" v-model="newPaper.submitId" placeholder="投稿编号" />
            </div>
            <div style="display: flex; gap: 10px;">
              <input class="input" type="date" v-model="newPaper.statusDate" :placeholder="statusDateLabel(newPaper.status)" :title="statusDateLabel(newPaper.status)" />
              <input class="input" type="date" v-model="newPaper.deadline" placeholder="投稿截止（可选）" />
            </div>
            <GlassSelect
              v-model="newPaper.status"
              select-class="input"
              :options="papersStore.statuses.map(s => ({ value: s.id, label: s.name }))"
            />
            <div style="display: flex; gap: 8px; justify-content: space-between;">
              <button v-if="editingPaper" class="btn btn-danger btn-sm" @click="deletePaperFromEdit"><AppIcon name="trash" />  删除论文</button>
              <span v-else></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 论文前世今生详情弹窗 -->
    <div v-if="detailPaper" class="modal-overlay" @click.self="closeDetailPaper">
      <div class="modal-content" style="max-width: 560px;">
        <div style="padding: 24px;">
          <div class="modal-head" style="align-items: flex-start;">
            <div>
              <h3 class="modal-head-title" style="margin-bottom: 4px;">{{ detailPaper.title }}</h3>
              <div class="detail-sub">{{ detailPaper.journal || '未填写期刊' }} · {{ detailPaper.topic || '未填写主题' }}</div>
            </div>
            <div class="modal-head-actions" style="margin-top: 2px;">
              <button class="soft-btn soft-btn-primary" @click="closeDetailPaper(); openEditPaper(detailPaper)" title="编辑">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                编辑
              </button>
              <button class="soft-btn-close" @click="closeDetailPaper" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div class="lifecycle">
            <h4 style="margin: 18px 0 12px; font-size: 14px;"><AppIcon name="scroll-text" />  前世今生</h4>
            <div class="lifecycle-timeline">
              <div v-for="(h, i) in (detailPaper.statusHistory || [])" :key="i" class="life-node"
                :class="{ current: h.status === detailPaper.status }">
                <span class="life-dot" :style="{ background: statusColor(h.status) }"></span>
                <div class="life-info">
                  <span class="life-status" :style="{ color: statusColor(h.status) }">{{ statusName(h.status) }}</span>
                  <span class="life-date">{{ h.date }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-meta-grid">
            <div class="meta-cell"><span class="meta-k">当前状态</span><span class="meta-v" :style="{ color: statusColor(detailPaper.status) }">{{ statusName(detailPaper.status) }}</span></div>
            <div class="meta-cell"><span class="meta-k">DOI</span><span class="meta-v">{{ detailPaper.doi || '—' }}</span></div>
            <div class="meta-cell"><span class="meta-k">投稿编号</span><span class="meta-v">{{ detailPaper.submitId || '—' }}</span></div>
            <div class="meta-cell"><span class="meta-k">投稿截止</span><span class="meta-v">{{ detailPaper.deadline || '—' }}</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 组会纪要模板配置弹窗 -->
    <div v-if="showTemplateModal" class="modal-overlay" @click.self="showTemplateModal = false">
      <div class="modal-content" style="max-width: 680px; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;">
        <div class="modal-head" style="flex-shrink:0;padding:18px 24px 0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <h3 class="modal-head-title" style="margin:0;">组会纪要模板配置</h3>
          </div>
          <button class="soft-btn-close" @click="showTemplateModal = false" title="关闭">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="padding:20px 24px;overflow-y:auto;flex:1;min-height:0;">
          <p class="form-hint" style="margin-bottom:14px;">自定义添加纪要时需要填写的字段。可以增删改字段名称和类型，修改后立即生效。</p>
          <div class="meeting-fields-list">
            <div v-for="(field, index) in templateFields" :key="field.id" class="meeting-field-row">
              <div class="field-sort">
                <button class="sort-btn" :disabled="index === 0" @click="moveTemplateField(index, -1)" title="上移">▲</button>
                <button class="sort-btn" :disabled="index === templateFields.length - 1" @click="moveTemplateField(index, 1)" title="下移">▼</button>
              </div>
              <div class="field-toggle">
                <label class="switch">
                  <input type="checkbox" v-model="field.enabled" @change="saveTemplateFields" />
                  <span class="switch-slider"></span>
                </label>
              </div>
              <div class="field-inputs">
                <input class="input input-sm" v-model="field.label" placeholder="字段名称" @input="saveTemplateFields" />
                <GlassSelect
                  v-model="field.type"
                  @change="saveTemplateFields"
                  style="width:100px"
                  select-class="input input-sm"
                  size="sm"
                  :options="[
                    { value: 'textarea', label: '多行文本' },
                    { value: 'text', label: '单行文本' }
                  ]"
                />
              </div>
              <button class="btn btn-sm btn-ghost" @click="deleteTemplateField(field.id)" title="删除字段">✕</button>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" @click="addTemplateField" style="margin-top:8px;">+ 添加自定义字段</button>

          <!-- 参与人员管理 -->
          <div style="margin-top:24px;border-top:1px solid var(--color-border-light);padding-top:16px;">
            <h4 style="margin:0 0 6px;font-size:14px;font-weight:600;">参与人员管理</h4>
            <p class="form-hint" style="margin-bottom:12px;">在此配置常参与组会的人员并分组管理。每个人默认分配颜色，点击圆点可自定义。记录纪要时按分组多选。</p>

            <!-- 分组管理 -->
            <div class="participant-groups-row">
              <div v-for="(group, gi) in participantGroupList" :key="group.id" class="participant-group-chip">
                <input class="input input-xs participant-group-name-input" v-model="group.name" @input="saveParticipantGroups" placeholder="分组名" />
                <button class="btn btn-xs btn-ghost" @click="deleteParticipantGroup(group.id)" title="删除分组" style="color:var(--color-danger);padding:0 2px;font-size:10px;">✕</button>
              </div>
              <button class="btn btn-secondary btn-xs" @click="addParticipantGroup">+ 分组</button>
            </div>

            <!-- 按分组展示人员 -->
            <div v-for="group in participantGroupsWithPeople" :key="group.id" class="participant-group-section">
              <div class="participant-group-header">
                <span class="participant-group-title">{{ group.name || '未命名分组' }}</span>
                <span class="participant-group-count">{{ group.people.length }} 人</span>
              </div>
              <div class="meeting-fields-list">
                <div v-for="(person, index) in group.people" :key="person.id" class="meeting-field-row">
                  <div class="field-sort">
                    <button class="sort-btn" :disabled="isFirstInGroup(person, group.id)" @click="moveParticipantInGroup(person, group.id, -1)" title="上移">▲</button>
                    <button class="sort-btn" :disabled="isLastInGroup(person, group.id)" @click="moveParticipantInGroup(person, group.id, 1)" title="下移">▼</button>
                  </div>
                  <button class="participant-color-dot" :style="{ background: person.color }" @click="openColorPicker(person)" title="点击自定义颜色"></button>
                  <div class="field-inputs">
                    <input class="input input-sm" v-model="person.name" placeholder="姓名" @input="saveParticipants" />
                  </div>
                  <select class="input input-xs participant-group-select" :value="person.groupId || ''" @change="changeParticipantGroup(person, $event)">
                    <option value="">未分组</option>
                    <option v-for="g in participantGroupList" :key="g.id" :value="g.id">{{ g.name }}</option>
                  </select>
                  <button class="btn btn-sm btn-ghost" @click="deleteParticipant(person.id)" title="删除" style="color:var(--color-danger);">✕</button>
                </div>
              </div>
            </div>

            <!-- 未分组人员 -->
            <div v-if="ungroupedParticipants.length" class="participant-group-section">
              <div class="participant-group-header">
                <span class="participant-group-title">未分组</span>
                <span class="participant-group-count">{{ ungroupedParticipants.length }} 人</span>
              </div>
              <div class="meeting-fields-list">
                <div v-for="(person, index) in ungroupedParticipants" :key="person.id" class="meeting-field-row">
                  <div class="field-sort">
                    <button class="sort-btn" :disabled="index === 0" @click="moveParticipantGlobal(person, -1)" title="上移">▲</button>
                    <button class="sort-btn" :disabled="index === ungroupedParticipants.length - 1" @click="moveParticipantGlobal(person, 1)" title="下移">▼</button>
                  </div>
                  <button class="participant-color-dot" :style="{ background: person.color }" @click="openColorPicker(person)" title="点击自定义颜色"></button>
                  <div class="field-inputs">
                    <input class="input input-sm" v-model="person.name" placeholder="姓名" @input="saveParticipants" />
                  </div>
                  <select class="input input-xs participant-group-select" :value="person.groupId || ''" @change="changeParticipantGroup(person, $event)">
                    <option value="">未分组</option>
                    <option v-for="g in participantGroupList" :key="g.id" :value="g.id">{{ g.name }}</option>
                  </select>
                  <button class="btn btn-sm btn-ghost" @click="deleteParticipant(person.id)" title="删除" style="color:var(--color-danger);">✕</button>
                </div>
              </div>
            </div>

            <button class="btn btn-secondary btn-sm" @click="addParticipant" style="margin-top:8px;">+ 添加人员</button>
          </div>

          <!-- 颜色选择弹窗 -->
          <div v-if="colorPickerPerson" class="modal-overlay" style="position:absolute;z-index:10;" @click.self="colorPickerPerson = null">
            <div class="color-picker-popover">
              <div class="color-picker-section">
                <div class="color-picker-label">系统颜色</div>
                <div class="color-picker-grid">
                  <button v-for="c in participantColors" :key="c" class="color-dot-btn" :class="{ active: colorPickerPerson.color === c }" :style="{ background: c }" @click="setParticipantColor(colorPickerPerson, c); colorPickerPerson = null" :title="c"></button>
                </div>
              </div>
              <div class="color-picker-section">
                <div class="color-picker-label">自定义颜色</div>
                <div class="color-picker-custom">
                  <input type="color" :value="colorPickerPerson.color" @input="setParticipantColor(colorPickerPerson, $event.target.value)" />
                  <span class="color-hex-text">{{ colorPickerPerson.color }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="padding:12px 24px 18px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--color-border-light);flex-shrink:0;">
          <button class="btn btn-sm btn-ghost" @click="resetTemplateFields">恢复默认</button>
          <button class="btn btn-primary btn-sm" @click="showTemplateModal = false">完成</button>
        </div>
      </div>
    </div>

    <!-- 添加组会纪要弹窗 -->
    <div v-if="showAddMeeting" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showAddMeeting = false })">
      <div class="modal-content" style="max-width: 520px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">{{ editingMeeting ? '编辑组会纪要' : '记录组会/沟通纪要' }}</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-primary" @click="saveMeeting" :title="editingMeeting ? '保存' : '添加'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ editingMeeting ? '保存' : '添加' }}
              </button>
              <button class="soft-btn-close" @click="closeMeetingModal" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 10px;">
              <input class="input" type="date" v-model="newMeeting.date" />
              <input class="input" v-model="newMeeting.timePeriod" placeholder="时间段 (如 14:00-15:30)" />
            </div>
            <div v-if="sortedParticipants.length || selectedLegacyParticipants.length" class="meeting-participant-picker">
              <span class="field-label" style="margin-bottom:4px;">参与人员</span>
              <div v-for="group in groupedParticipantsForSelect" :key="group.id || 'ungrouped'" class="participant-select-group">
                <span v-if="group.name" class="participant-select-group-name">{{ group.name }}</span>
                <div class="participant-tags-select">
                  <button v-for="person in group.people" :key="person.id"
                    class="participant-tag" :class="{ selected: selectedParticipantIds.includes(person.id) }"
                    :style="selectedParticipantIds.includes(person.id) ? { background: person.color, borderColor: person.color } : {}"
                    @click="toggleParticipant(person.id)">
                    {{ person.name }}
                  </button>
                </div>
              </div>
              <div v-if="selectedLegacyParticipants.length" class="participant-select-group">
                <span class="participant-select-group-name">未配置人员</span>
                <div class="participant-tags-select">
                  <button v-for="person in selectedLegacyParticipants" :key="person.id"
                    class="participant-tag selected" :style="{ background: person.color, borderColor: person.color }"
                    @click="toggleParticipant(person.id)" :title="'历史记录中的人员，不在参与人员配置中，点击取消选中'">
                    {{ person.name }}
                  </button>
                </div>
              </div>
            </div>
            <template v-for="field in enabledMeetingFields" :key="field.key">
              <textarea v-if="field.type === 'textarea'" class="input" v-model="newMeeting.customData[field.key]"
                :placeholder="field.label" rows="2"></textarea>
              <input v-else class="input" v-model="newMeeting.customData[field.key]" :placeholder="field.label" />
            </template>
            <div style="display: flex; gap: 8px; justify-content: space-between;">
              <button v-if="editingMeeting" class="btn btn-danger btn-sm" @click="deleteMeetingFromEdit"><AppIcon name="trash" />  删除纪要</button>
              <span v-else></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 论文状态自定义弹窗 -->
    <div v-if="showStatusModal" class="modal-overlay" @click.self="showStatusModal = false">
      <div class="modal-content" style="max-width: 480px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">论文状态配置</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-primary" @click="saveStatusConfig">保存</button>
              <button class="soft-btn-close" @click="showStatusModal = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
            <div v-for="(s, idx) in editingStatuses" :key="s.id" style="display:flex;align-items:center;gap:8px;">
              <input type="color" v-model="s.color" style="width:34px;height:30px;border:none;background:none;padding:0;cursor:pointer;" />
              <input class="input input-sm" v-model="s.name" style="flex:1;" placeholder="状态名称" />
              <button class="btn btn-sm btn-ghost" @click="moveStatus(idx, -1)" :disabled="idx === 0" title="上移">↑</button>
              <button class="btn btn-sm btn-ghost" @click="moveStatus(idx, 1)" :disabled="idx === editingStatuses.length - 1" title="下移">↓</button>
              <button class="btn btn-sm btn-ghost" @click="removeStatus(idx)" style="color:var(--color-danger);" title="删除">✕</button>
            </div>
            <button class="btn btn-sm btn-outline" @click="addStatus" style="align-self:flex-start;">+ 新增状态</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 培养阶段自定义弹窗 -->
    <div v-if="showStageModal" class="modal-overlay" @click.self="showStageModal = false">
      <div class="modal-content" style="max-width: 480px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">培养阶段配置</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-ghost" @click="resetStages" style="margin-right:8px;">恢复默认</button>
              <button class="soft-btn soft-btn-primary" @click="saveStageConfig">保存</button>
              <button class="soft-btn-close" @click="showStageModal = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px;">
            <div v-for="(s, idx) in editingStages" :key="s.id" style="display:flex;align-items:center;gap:8px;">
              <input type="color" v-model="s.color" style="width:34px;height:30px;border:none;background:none;padding:0;cursor:pointer;" />
              <input class="input input-sm" v-model="s.name" style="flex:1;" placeholder="阶段名称" />
              <button class="btn btn-sm btn-ghost" @click="moveStage(idx, -1)" :disabled="idx === 0" title="上移">↑</button>
              <button class="btn btn-sm btn-ghost" @click="moveStage(idx, 1)" :disabled="idx === editingStages.length - 1" title="下移">↓</button>
              <button class="btn btn-sm btn-ghost" @click="removeStage(idx)" style="color:var(--color-danger);" title="删除">✕</button>
            </div>
            <button class="btn btn-sm btn-outline" @click="addStage" style="align-self:flex-start;">+ 新增阶段</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 培养节点编辑弹窗 -->
    <div v-if="showEditMilestone" class="modal-overlay" @click.self="showEditMilestone = false">
      <div class="modal-content" style="max-width: 480px;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">编辑培养节点</h3>
            <button class="soft-btn-close" @click="showEditMilestone = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:14px;">
            <div>
              <label class="field-label">节点名称</label>
              <input class="input" v-model="milestoneForm.name" placeholder="节点名称" />
            </div>
            <div>
              <label class="field-label">状态</label>
              <GlassSelect
                v-model="milestoneForm.status"
                select-class="input"
                :options="[
                  { value: 'pending', label: '待开始' },
                  { value: 'active', label: '进行中' },
                  { value: 'completed', label: '已完成' }
                ]"
              />
            </div>
            <div>
              <label class="field-label">预计日期</label>
              <input type="date" class="input" v-model="milestoneForm.plannedDate" />
            </div>
            <div>
              <label class="field-label">完成日期</label>
              <input type="date" class="input" v-model="milestoneForm.date" />
            </div>
            <button class="btn btn-primary" @click="saveMilestoneEdit">保存</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { usePapersStore, useResearchStore, useTasksStore, useSettingsStore } from '../stores'
import { todayStr, nowStr, save } from '../utils/storage'
import { printHtml } from '../utils/desktopBridge'
import GlassSelect from '../components/common/GlassSelect.vue'
import dayjs from 'dayjs'

const ASSISTANT_STATE_KEY = 'mw_researchAssistantState'

const papersStore = usePapersStore()
const researchStore = useResearchStore()
const tasksStore = useTasksStore()
const settingsStore = useSettingsStore()

const activeTab = ref(settingsStore.activeSubTabs['/research'] || 'papers')
watch(activeTab, (v) => settingsStore.setActiveSubTab('/research', v))
watch(() => settingsStore.activeSubTabs['/research'], (v) => { if (v && v !== activeTab.value) activeTab.value = v })
const tabs = [
  { id: 'papers', name: '论文管理' },
  { id: 'assistant', name: '研究助手' },
  { id: 'meetings', name: '组会纪要' },
  { id: 'milestones', name: '培养节点' },
]

const showAddPaper = ref(false)
const showAddMeeting = ref(false)
const showTemplateModal = ref(false)
const editingPaper = ref(null)  // null = adding, paper object = editing
const editingMeeting = ref(null) // null = adding, meeting object = editing

const newPaper = ref({ title: '', journal: '', doi: '', submitId: '', deadline: '', topic: '', status: 'idea', statusDate: '' })
const detailPaper = ref(null)
const newMeeting = ref({ date: todayStr(), timePeriod: '', participants: [], gains: '', doubts: '', nextSteps: '', customData: {} })
const selectedParticipantIds = ref([])

// 编辑旧纪要时：历史记录中存在但未在参与人员配置中的人员（伪 id 保留，点击可取消）
const selectedLegacyParticipants = computed(() =>
  selectedParticipantIds.value
    .filter(id => typeof id === 'string' && id.startsWith('legacy::'))
    .map(id => ({ id, name: id.slice(8), color: '#6B7280' }))
)

// ===== 导出菜单 =====
const exportMenus = ref({ papers: false, meetings: false, milestones: false })
function toggleExportMenu(which) {
  for (const k in exportMenus.value) exportMenus.value[k] = (k === which) ? !exportMenus.value[k] : false
}
function closeExportMenus() { exportMenus.value = { papers: false, meetings: false, milestones: false } }
function handleClickOutside(e) {
  if (!e.target.closest('.export-dropdown')) closeExportMenus()
}
onMounted(() => document.addEventListener('click', handleClickOutside))

// ===== 研究助手状态 =====
const defaultStages = () => [
  { id: 'idea', name: '想法', color: '#A855F7', items: [
    { text: '确定研究对象', done: false },
    { text: '明确核心变量', done: false },
    { text: '初步文献扫描', done: false },
  ]},
  { id: 'draft', name: '草稿', color: '#0EA5E9', items: [
    { text: '完成研究问题表述', done: false },
    { text: '撰写大纲（引言/方法/结果/讨论）', done: false },
    { text: '确定数据来源与收集方法', done: false },
  ]},
  { id: 'revising', name: '修改中', color: '#F97316', items: [
    { text: '补充关键文献', done: false },
    { text: '完善方法细节', done: false },
    { text: '检查图表与数据一致性', done: false },
  ]},
  { id: 'submitted', name: '已投', color: '#2563EB', items: [
    { text: '确认投稿材料完整', done: false },
    { text: '记录投稿编号与日期', done: false },
    { text: '备份最终版本', done: false },
  ]},
  { id: 'revision', name: '返修', color: '#EC4899', items: [
    { text: '逐条整理审稿意见', done: false },
    { text: '撰写回复信（Response Letter）', done: false },
    { text: '核对修改稿标注', done: false },
  ]},
  { id: 'proof', name: '校样', color: '#06B6D4', items: [
    { text: '核对作者信息与单位', done: false },
    { text: '检查图表清晰度', done: false },
    { text: '确认基金与致谢', done: false },
  ]},
  { id: 'published', name: '发表', color: '#22C55E', items: [
    { text: '保存正式发表版本', done: false },
    { text: '更新个人学术主页', done: false },
    { text: '归档相关数据与代码', done: false },
  ]},
]

const defaultCitationChecks = () => [
  { title: '核心论点是否有来源支撑？', done: false, needsSource: true, source: '' },
  { title: '关键数据/结论是否可追溯到 PDF/网页？', done: false, needsSource: true, source: '' },
  { title: '是否存在尚未验证的引用或转引？', done: false, needsSource: true, source: '' },
]

const assistant = reactive({
  topic: { object: '', variable: '', data: '', contribution: '', result: '' },
  review: { theme: '', subtheme: '', literature: '', debate: '', gap: '', result: '' },
  stages: defaultStages(),
  citationChecks: defaultCitationChecks(),
})

onMounted(() => {
  try {
    const saved = localStorage.getItem(ASSISTANT_STATE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.stages) assistant.stages = parsed.stages
      if (parsed.citationChecks) assistant.citationChecks = parsed.citationChecks
    }
  } catch {}
})

function saveAssistantState() {
  localStorage.setItem(ASSISTANT_STATE_KEY, JSON.stringify({
    stages: assistant.stages,
    citationChecks: assistant.citationChecks,
  }))
}

function generateResearchQuestion() {
  const { object, variable, data, contribution } = assistant.topic
  if (!object || !variable) {
    assistant.topic.result = '请至少填写「研究对象」和「核心变量」。'
    return
  }
  assistant.topic.result = `本研究以「${object}」为研究对象，聚焦「${variable}」，拟采用${data || 'XX方法'}收集数据，旨在${contribution || '揭示其作用机制'}。一句话表述：在${object || '特定情境'}下，${variable}如何影响相关结果？其作用路径是什么？`
}

function generateReviewParagraph() {
  const { theme, subtheme, literature, debate, gap } = assistant.review
  if (!theme) {
    assistant.review.result = '请至少填写「研究主题」。'
    return
  }
  assistant.review.result = `关于「${theme}」的研究，现有文献主要从「${subtheme || '若干子主题'}」展开。代表性研究包括 ${literature || '（请补充关键文献）'}。然而，已有发现在「${debate || '具体争议点'}」方面尚不一致，且「${gap || '研究缺口'}」仍未得到充分探讨。因此，本研究拟在上述缺口基础上进一步深入。`
}

function stageDoneCount(stage) {
  return stage.items.filter(i => i.done).length
}

function resetStageChecklist() {
  assistant.stages = defaultStages()
  assistant.citationChecks = defaultCitationChecks()
  saveAssistantState()
}

const enabledMeetingFields = computed(() => {
  return settingsStore.customMeetingFields.filter(f => f.enabled).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
})

function getCurrentStatusOrder(paper) {
  return papersStore.statuses.find(s => s.id === paper.status)?.order || 0
}

function statusName(id) {
  return papersStore.statuses.find(s => s.id === id)?.name || id
}
function statusColor(id) {
  return papersStore.statuses.find(s => s.id === id)?.color || '#6B7280'
}
// 状态对应的日期标签（如「想法日期」「草稿日期」）
function statusDateLabel(statusId) {
  return statusName(statusId) + '日期'
}
// 取论文当前状态对应的日期
function statusDateOf(paper) {
  return paper.statusDates?.[paper.status] || paper.deadline || ''
}

// --- 论文前世今生详情 ---
function openDetailPaper(paper) {
  detailPaper.value = paper
}
function closeDetailPaper() {
  detailPaper.value = null
}

function isUrgent(deadline) {
  if (!deadline) return false
  const days = dayjs(deadline).diff(dayjs(), 'day')
  return days <= 3 && days >= 0
}

function deadlineCountdown(deadline) {
  if (!deadline) return ''
  const days = dayjs(deadline).diff(dayjs(), 'day')
  if (days < 0) return `已逾期${-days}天`
  if (days === 0) return '今天截止'
  return `还剩${days}天`
}

function daysUntil(date) {
  return dayjs(date).diff(dayjs(), 'day')
}

function updatePaperStatus(paper, status) {
  papersStore.updatePaper(paper.id, { status })
}

// --- 论文 添加/编辑/删除 ---
function openEditPaper(paper) {
  editingPaper.value = paper
  newPaper.value = {
    title: paper.title,
    journal: paper.journal,
    doi: paper.doi,
    submitId: paper.submitId,
    deadline: paper.deadline || '',
    topic: paper.topic,
    status: paper.status,
    statusDate: paper.statusDates?.[paper.status] || '',
  }
  showAddPaper.value = true
}

function closePaperModal() {
  showAddPaper.value = false
  editingPaper.value = null
  newPaper.value = { title: '', journal: '', doi: '', submitId: '', deadline: '', topic: '', status: 'idea', statusDate: '' }
}

function savePaper() {
  if (!newPaper.value.title.trim()) return
  if (editingPaper.value) {
    papersStore.updatePaper(editingPaper.value.id, { ...newPaper.value })
  } else {
    papersStore.addPaper({ ...newPaper.value })
  }
  closePaperModal()
}

function deletePaperConfirm(paper) {
  if (confirm(`确定删除论文「${paper.title}」吗？此操作不可恢复。`)) {
    papersStore.deletePaper(paper.id)
  }
}

function deletePaperFromEdit() {
  if (!editingPaper.value) return
  const paper = editingPaper.value
  if (confirm(`确定删除论文「${paper.title}」吗？此操作不可恢复。`)) {
    papersStore.deletePaper(paper.id)
    closePaperModal()
  }
}

// --- 组会纪要 添加/编辑/删除 ---
function openEditMeeting(meeting) {
  editingMeeting.value = meeting
  newMeeting.value = {
    date: meeting.date,
    timePeriod: meeting.timePeriod || '',
    participants: meeting.participants || [],
    gains: meeting.gains || '',
    doubts: meeting.doubts || '',
    nextSteps: meeting.nextSteps || '',
    customData: { ...(meeting.customData || {}) },
  }
  // 回填已选参与人员（兼容 v5.0.278 前的旧字符串格式，避免字符串无 .map 方法导致编辑弹窗报错无法打开）
  let participantArr = []
  const rawParticipants = meeting.participants
  if (Array.isArray(rawParticipants)) {
    participantArr = rawParticipants
  } else if (typeof rawParticipants === 'string' && rawParticipants.trim()) {
    participantArr = rawParticipants.split(/[、,，]/).map(s => s.trim()).filter(Boolean)
  }
  selectedParticipantIds.value = participantArr.map(p => {
    if (typeof p === 'string') {
      // 兼容旧数据：按名字匹配
      const found = settingsStore.meetingParticipants.find(sp => sp.name === p)
      // 已配置人员取其 id；未配置人员用伪 id 保留勾选，保存时自动还原为名字
      return found ? found.id : 'legacy::' + p
    }
    return p.id || p
  }).filter(Boolean)
  showAddMeeting.value = true
}

function openAddMeeting() {
  editingMeeting.value = null
  newMeeting.value = { date: todayStr(), timePeriod: '', participants: [], gains: '', doubts: '', nextSteps: '', customData: {} }
  selectedParticipantIds.value = []
  showAddMeeting.value = true
}

function closeMeetingModal() {
  showAddMeeting.value = false
  editingMeeting.value = null
  newMeeting.value = { date: todayStr(), timePeriod: '', participants: [], gains: '', doubts: '', nextSteps: '', customData: {} }
  selectedParticipantIds.value = []
}

function saveMeeting() {
  const customData = {}
  for (const field of enabledMeetingFields.value) {
    customData[field.key] = newMeeting.value.customData[field.key] || ''
  }
  // 将选中的 ID 转换为人员对象数组（legacy:: 伪 id 对应未配置人员，还原为名字保存）
  const participants = selectedParticipantIds.value
    .map(id => {
      if (typeof id === 'string' && id.startsWith('legacy::')) {
        return { id, name: id.slice(8), color: '#6B7280' }
      }
      return settingsStore.meetingParticipants.find(p => p.id === id)
    })
    .filter(Boolean)
    .map(p => ({ id: p.id, name: p.name, color: p.color }))
  const data = {
    date: newMeeting.value.date || todayStr(),
    timePeriod: newMeeting.value.timePeriod,
    participants,
    gains: customData.gains || newMeeting.value.gains || '',
    doubts: customData.doubts || newMeeting.value.doubts || '',
    nextSteps: customData.nextSteps || newMeeting.value.nextSteps || '',
    customData,
  }
  if (editingMeeting.value) {
    researchStore.updateMeeting(editingMeeting.value.id, data)
  } else {
    researchStore.addMeeting(data)
  }
  closeMeetingModal()
}

function deleteMeetingConfirm(meeting) {
  if (confirm(`确定删除 ${meeting.date} 的组会纪要吗？此操作不可恢复。`)) {
    researchStore.deleteMeeting(meeting.id)
  }
}

function deleteMeetingFromEdit() {
  if (!editingMeeting.value) return
  const meeting = editingMeeting.value
  if (confirm(`确定删除 ${meeting.date} 的组会纪要吗？此操作不可恢复。`)) {
    researchStore.deleteMeeting(meeting.id)
    closeMeetingModal()
  }
}

function getMeetingField(meeting, key) {
  if (meeting.customData && meeting.customData[key] !== undefined) return meeting.customData[key]
  return meeting[key] || ''
}

// --- 组会纪要模板配置 ---
const templateFields = ref(settingsStore.customMeetingFields.map(f => ({ ...f })))

function saveTemplateFields() {
  settingsStore.customMeetingFields = templateFields.value.map(f => ({ ...f }))
  save('customMeetingFields', settingsStore.customMeetingFields)
}

function addTemplateField() {
  const id = 'field_' + Date.now()
  templateFields.value.push({
    id,
    label: '新字段',
    type: 'textarea',
    enabled: true,
    key: id,
    sortOrder: templateFields.value.length,
  })
  saveTemplateFields()
}

function deleteTemplateField(id) {
  templateFields.value = templateFields.value.filter(f => f.id !== id)
  saveTemplateFields()
}

function moveTemplateField(index, direction) {
  const fields = templateFields.value
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= fields.length) return
  ;[fields[index], fields[newIndex]] = [fields[newIndex], fields[index]]
  fields.forEach((f, i) => { f.sortOrder = i })
  saveTemplateFields()
}

function resetTemplateFields() {
  if (!confirm('确定恢复默认模板吗？当前自定义配置将被覆盖。')) return
  templateFields.value = [
    { id: 'gains', label: '主要收获', type: 'textarea', enabled: true, key: 'gains', sortOrder: 0 },
    { id: 'doubts', label: '疑问与困惑', type: 'textarea', enabled: true, key: 'doubts', sortOrder: 1 },
    { id: 'nextSteps', label: '下一步计划', type: 'textarea', enabled: true, key: 'nextSteps', sortOrder: 2 },
  ]
  saveTemplateFields()
}

// --- 组会纪要参与人员配置 ---
const participantColors = ['#4F8DF7', '#EF6D6D', '#F5A623', '#42B883', '#9B59B6', '#1ABC9C', '#E67E22', '#3498DB', '#E91E63', '#8E44AD']
const participantList = ref(settingsStore.meetingParticipants.map(p => ({ ...p })))
const participantGroupList = ref(settingsStore.participantGroups.map(g => ({ ...g })))
const colorPickerPerson = ref(null)

const sortedParticipants = computed(() => {
  return [...settingsStore.meetingParticipants].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
})

// 按分组组织人员（用于记录纪要弹窗展示）
const groupedParticipantsForSelect = computed(() => {
  const groups = []
  // 先放有分组的人员
  for (const g of [...participantGroupList.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))) {
    const people = sortedParticipants.value.filter(p => p.groupId === g.id)
    if (people.length) groups.push({ id: g.id, name: g.name, people })
  }
  // 再放未分组人员
  const ungrouped = sortedParticipants.value.filter(p => !p.groupId || !participantGroupList.value.find(g => g.id === p.groupId))
  if (ungrouped.length) groups.push({ id: 'ungrouped', name: '', people: ungrouped })
  return groups
})

// 按分组组织人员（用于模板配置弹窗展示）
const participantGroupsWithPeople = computed(() => {
  return [...participantGroupList.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(g => ({
    ...g,
    people: participantList.value.filter(p => p.groupId === g.id)
  }))
})

const ungroupedParticipants = computed(() => {
  return participantList.value.filter(p => !p.groupId || !participantGroupList.value.find(g => g.id === p.groupId))
})

function saveParticipants() {
  settingsStore.meetingParticipants = participantList.value.map(p => ({ ...p }))
  save('meetingParticipants', settingsStore.meetingParticipants)
}

function saveParticipantGroups() {
  settingsStore.participantGroups = participantGroupList.value.map(g => ({ ...g }))
  save('participantGroups', settingsStore.participantGroups)
}

function addParticipant() {
  const id = 'p_' + Date.now()
  const colorIndex = participantList.value.length % participantColors.length
  participantList.value.push({ id, name: '新人员', color: participantColors[colorIndex], sortOrder: participantList.value.length, groupId: null })
  saveParticipants()
}

function deleteParticipant(id) {
  participantList.value = participantList.value.filter(p => p.id !== id)
  participantList.value.forEach((p, i) => { p.sortOrder = i })
  saveParticipants()
}

function moveParticipantInGroup(person, groupId, direction) {
  const groupPeople = participantList.value.filter(p => (p.groupId || null) === (groupId || null))
  const idx = groupPeople.findIndex(p => p.id === person.id)
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= groupPeople.length) return
  const a = groupPeople[idx]
  const b = groupPeople[newIdx]
  const aGlobal = participantList.value.findIndex(p => p.id === a.id)
  const bGlobal = participantList.value.findIndex(p => p.id === b.id)
  const tmp = participantList.value[aGlobal]
  participantList.value[aGlobal] = participantList.value[bGlobal]
  participantList.value[bGlobal] = tmp
  participantList.value.forEach((p, i) => { p.sortOrder = i })
  saveParticipants()
}

function moveParticipantGlobal(person, direction) {
  const ungrouped = ungroupedParticipants.value
  const idx = ungrouped.findIndex(p => p.id === person.id)
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= ungrouped.length) return
  const a = ungrouped[idx]
  const b = ungrouped[newIdx]
  const aGlobal = participantList.value.findIndex(p => p.id === a.id)
  const bGlobal = participantList.value.findIndex(p => p.id === b.id)
  const tmp = participantList.value[aGlobal]
  participantList.value[aGlobal] = participantList.value[bGlobal]
  participantList.value[bGlobal] = tmp
  participantList.value.forEach((p, i) => { p.sortOrder = i })
  saveParticipants()
}

function isFirstInGroup(person, groupId) {
  const groupPeople = participantList.value.filter(p => (p.groupId || null) === (groupId || null))
  return groupPeople[0]?.id === person.id
}

function isLastInGroup(person, groupId) {
  const groupPeople = participantList.value.filter(p => (p.groupId || null) === (groupId || null))
  return groupPeople[groupPeople.length - 1]?.id === person.id
}

function changeParticipantGroup(person, event) {
  const newGroupId = event.target.value || null
  person.groupId = newGroupId
  saveParticipants()
}

function addParticipantGroup() {
  const id = 'g_' + Date.now()
  participantGroupList.value.push({ id, name: '新分组', sortOrder: participantGroupList.value.length })
  saveParticipantGroups()
}

function deleteParticipantGroup(id) {
  // 清除该组下人员的 groupId
  participantList.value.forEach(p => {
    if (p.groupId === id) p.groupId = null
  })
  saveParticipants()
  participantGroupList.value = participantGroupList.value.filter(g => g.id !== id)
  participantGroupList.value.forEach((g, i) => { g.sortOrder = i })
  saveParticipantGroups()
}

function openColorPicker(person) {
  colorPickerPerson.value = person
}

function setParticipantColor(person, color) {
  person.color = color
  saveParticipants()
}

function toggleParticipant(id) {
  const idx = selectedParticipantIds.value.indexOf(id)
  if (idx >= 0) {
    selectedParticipantIds.value.splice(idx, 1)
  } else {
    selectedParticipantIds.value.push(id)
  }
}

// 纪要列表中获取参与人员标签（兼容旧字符串格式）
function getParticipantTags(meeting) {
  if (!meeting.participants) return []
  if (Array.isArray(meeting.participants)) {
    return meeting.participants.map(p => {
      if (typeof p === 'string') {
        const found = settingsStore.meetingParticipants.find(sp => sp.name === p)
        return found ? { name: p, color: found.color } : { name: p, color: '#6B7280' }
      }
      return { name: p.name || '未知', color: p.color || '#6B7280' }
    })
  }
  // 旧字符串格式，按顿号/逗号分割
  return meeting.participants.split(/[、,，]/).map(s => s.trim()).filter(Boolean).map(name => {
    const found = settingsStore.meetingParticipants.find(sp => sp.name === name)
    return { name, color: found ? found.color : '#6B7280' }
  })
}

function completeMilestone(id) {
  researchStore.updateMilestone(id, { status: 'completed', date: todayStr() })
  // 激活下一个
  const idx = researchStore.milestones.findIndex(m => m.id === id)
  if (idx >= 0 && idx < researchStore.milestones.length - 1) {
    researchStore.updateMilestone(researchStore.milestones[idx + 1].id, { status: 'active' })
  }
}

function saveMilestones() {
  researchStore.updateMilestone(researchStore.milestones[0].id, {}) // trigger save
}

function saveMilestone(m) {
  const updates = { name: m.name, status: m.status, plannedDate: m.plannedDate, date: m.date }
  if (m.status === 'completed' && !m.date) updates.date = todayStr()
  researchStore.updateMilestone(m.id, updates)
}

// ===== 论文状态自定义 =====
const showStatusModal = ref(false)
const editingStatuses = ref([])
function openStatusModal() {
  editingStatuses.value = papersStore.statuses.map(s => ({ ...s }))
  showStatusModal.value = true
}
function addStatus() {
  editingStatuses.value.push({ id: 'st_' + Date.now(), name: '新状态', color: '#5B5FEF', order: editingStatuses.value.length })
}
function removeStatus(idx) {
  if (editingStatuses.value.length <= 1) { alert('至少保留一个状态'); return }
  editingStatuses.value.splice(idx, 1)
}
function moveStatus(idx, dir) {
  const j = idx + dir
  if (j < 0 || j >= editingStatuses.value.length) return
  const a = editingStatuses.value
  ;[a[idx], a[j]] = [a[j], a[idx]]
  editingStatuses.value = [...a]
}
function saveStatusConfig() {
  papersStore.updateStatuses(editingStatuses.value.map((s, i) => ({ ...s, order: i })))
  showStatusModal.value = false
}

// ===== 培养阶段自定义 =====
const showStageModal = ref(false)
const editingStages = ref([])
function openStageModal() {
  editingStages.value = researchStore.milestoneStages.map(s => ({ ...s }))
  showStageModal.value = true
}
function addStage() {
  editingStages.value.push({ id: 'stg_' + Date.now(), name: '新阶段', color: '#5B5FEF', order: editingStages.value.length })
}
function removeStage(idx) {
  if (editingStages.value.length <= 1) { alert('至少保留一个阶段'); return }
  editingStages.value.splice(idx, 1)
}
function moveStage(idx, dir) {
  const j = idx + dir
  if (j < 0 || j >= editingStages.value.length) return
  const a = editingStages.value
  ;[a[idx], a[j]] = [a[j], a[idx]]
  editingStages.value = [...a]
}
function saveStageConfig() {
  researchStore.updateMilestoneStages(editingStages.value.map((s, i) => ({ ...s, order: i })))
  showStageModal.value = false
}
function resetStages() {
  if (!confirm('确定恢复默认阶段吗？')) return
  researchStore.resetMilestoneStages()
  showStageModal.value = false
}

// ===== 培养节点弹窗编辑 =====
const showEditMilestone = ref(false)
const editingMilestone = ref(null)
const milestoneForm = ref({ name: '', status: 'pending', plannedDate: '', date: '' })
function openEditMilestone(m) {
  editingMilestone.value = m
  milestoneForm.value = { name: m.name, status: m.status, plannedDate: m.plannedDate || '', date: m.date || '' }
  showEditMilestone.value = true
}
function saveMilestoneEdit() {
  if (!milestoneForm.value.name.trim()) { alert('请填写节点名称'); return }
  const u = { name: milestoneForm.value.name, status: milestoneForm.value.status, plannedDate: milestoneForm.value.plannedDate, date: milestoneForm.value.date }
  if (u.status === 'completed' && !u.date) u.date = todayStr()
  researchStore.updateMilestone(editingMilestone.value.id, u)
  showEditMilestone.value = false
}

// ===== 导出（Markdown / PDF 打印）=====
function escapeHtml(str) {
  if (!str) return ''
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
function downloadMd(filename, md) {
  const blob = new Blob(['\uFEFF' + md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
function buildPrintHtml(title, sections) {
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title><style>'
  html += 'body{font-family:"Microsoft YaHei","PingFang SC",sans-serif;padding:32px;color:#1F2937;max-width:820px;margin:0 auto}'
  html += 'h1{font-size:24px;margin-bottom:6px}.meta{color:#9CA3AF;font-size:13px;margin-bottom:24px}'
  html += '.item{margin-bottom:22px;padding-bottom:14px;border-bottom:1px solid #EEE;page-break-inside:avoid}'
  html += '.item h2{font-size:17px;margin-bottom:6px}.line{color:#4B5563;font-size:13px;line-height:1.7}'
  html += '@media print{body{padding:16px}.item{page-break-inside:avoid}}</style></head><body>'
  html += '<h1>' + escapeHtml(title) + '</h1><div class="meta">导出时间：' + new Date().toLocaleString() + '</div>'
  sections.forEach((s, i) => {
    html += '<div class="item"><h2>' + (i + 1) + '. ' + escapeHtml(s.title) + '</h2>'
    ;(s.lines || []).forEach(l => { if (l) html += '<div class="line">' + escapeHtml(l) + '</div>' })
    html += '</div>'
  })
  html += '</body></html>'
  return html
}


function exportPapersMarkdown() {
  closeExportMenus()
  const papers = papersStore.papers
  if (!papers.length) { alert('没有可导出的论文'); return }
  let md = '# 论文稿件管理\n\n> 共 ' + papers.length + ' 篇\n\n'
  papers.forEach((p, i) => {
    md += '## ' + (i + 1) + '. ' + p.title + '\n'
    if (p.journal) md += '- 期刊：' + p.journal + '\n'
    if (p.doi) md += '- DOI：' + p.doi + '\n'
    md += '- 状态：' + statusName(p.status) + '\n'
    if (p.deadline) md += '- 截止：' + p.deadline + '\n'
    if (p.topic) md += '- 主题：' + p.topic + '\n'
    md += '\n'
  })
  downloadMd('论文稿件_' + todayStr() + '.md', md)
}
function exportPapersPdf() {
  closeExportMenus()
  const papers = papersStore.papers
  if (!papers.length) { alert('没有可导出的论文'); return }
  const sections = papers.map(p => ({
    title: p.title,
    lines: [p.journal && ('期刊：' + p.journal), p.doi && ('DOI：' + p.doi), '状态：' + statusName(p.status), p.deadline && ('截止：' + p.deadline), p.topic && ('主题：' + p.topic)].filter(Boolean),
  }))
  printHtml(buildPrintHtml('论文稿件管理', sections))
}

function exportMeetingsMarkdown() {
  closeExportMenus()
  const list = researchStore.meetings
  if (!list.length) { alert('没有可导出的纪要'); return }
  let md = '# 组会/沟通纪要\n\n> 共 ' + list.length + ' 条\n\n'
  list.forEach((m, i) => {
    md += '## ' + (i + 1) + '. ' + m.date + '\n'
    if (m.timePeriod) md += '- 时段：' + m.timePeriod + '\n'
    if (m.participants) {
      const tags = getParticipantTags(m)
      if (tags.length) md += '- 参与：' + tags.map(t => t.name).join('、') + '\n'
    }
    for (const f of enabledMeetingFields.value) {
      const v = getMeetingField(m, f.key)
      if (v) md += '- ' + f.label + '：' + v + '\n'
    }
    md += '\n'
  })
  downloadMd('组会纪要_' + todayStr() + '.md', md)
}
function exportMeetingsPdf() {
  closeExportMenus()
  const list = researchStore.meetings
  if (!list.length) { alert('没有可导出的纪要'); return }
  const sections = list.map(m => ({
    title: m.date + (m.participants && getParticipantTags(m).length ? ' · ' + getParticipantTags(m).map(t => t.name).join('、') : ''),
    lines: [m.timePeriod && ('时段：' + m.timePeriod)].concat(
      enabledMeetingFields.value.map(f => { const v = getMeetingField(m, f.key); return v ? (f.label + '：' + v) : null }).filter(Boolean)
    ),
  }))
  printHtml(buildPrintHtml('组会/沟通纪要', sections))
}

function exportMilestonesMarkdown() {
  closeExportMenus()
  const list = researchStore.milestones
  if (!list.length) { alert('没有可导出的培养节点'); return }
  let md = '# 培养节点\n\n> 共 ' + list.length + ' 个\n\n'
  list.forEach((m, i) => {
    md += (i + 1) + '. ' + m.name + ' ［' + (m.status === 'completed' ? '已完成' : m.status === 'active' ? '进行中' : '待开始') + '］\n'
    if (m.date) md += '   - 完成：' + m.date + '\n'
    if (m.plannedDate) md += '   - 预计：' + m.plannedDate + '\n'
  })
  downloadMd('培养节点_' + todayStr() + '.md', md)
}
function exportMilestonesPdf() {
  closeExportMenus()
  const list = researchStore.milestones
  if (!list.length) { alert('没有可导出的培养节点'); return }
  const sections = list.map(m => ({
    title: m.name,
    lines: ['状态：' + (m.status === 'completed' ? '已完成' : m.status === 'active' ? '进行中' : '待开始'), m.date && ('完成：' + m.date), m.plannedDate && ('预计：' + m.plannedDate)].filter(Boolean),
  }))
  printHtml(buildPrintHtml('培养节点', sections))
}
</script>

<style scoped>
.research-page { max-width: 1800px; margin: 0 auto; }

/* ===== Tab 栏：胶囊样式（与计划中心一致） ===== */
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

.section-card { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; }

.paper-list { display: flex; flex-direction: column; gap: 10px; }
.paper-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg);
}
.paper-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.paper-meta { display: flex; gap: 12px; font-size: 12px; color: var(--color-text-secondary); flex-wrap: wrap; }
.meta-item.deadline.urgent { color: var(--color-danger); font-weight: 600; }
.paper-status-area { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.paper-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 8px;
  padding-left: 12px;
  border-left: 1px solid var(--color-border-light);
}
.status-select {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
}
.status-timeline-mini { display: flex; gap: 3px; }
.timeline-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--color-border);
}
.timeline-dot.done { opacity: 1; }
.timeline-dot.current { box-shadow: 0 0 0 3px var(--color-primary-bg); }

/* 论文标题区可点击查看详情 */
.paper-main { cursor: pointer; }
.paper-main:hover .paper-title { color: var(--color-primary); }
.meta-item.status-date { color: var(--color-primary); font-weight: 600; }

/* 论文前世今生详情弹窗 */
.detail-sub { font-size: 13px; color: var(--color-text-tertiary); margin-bottom: 4px; }
.lifecycle-timeline { display: flex; flex-direction: column; gap: 2px; }
.life-node { display: flex; align-items: center; gap: 12px; padding: 8px 0; position: relative; }
.life-node::before {
  content: ''; position: absolute; left: 5px; top: 22px; bottom: -10px;
  width: 2px; background: var(--color-border-light);
}
.life-node:last-child::before { display: none; }
.life-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; z-index: 1; box-shadow: 0 0 0 3px #fff; }
.life-info { display: flex; align-items: baseline; gap: 10px; }
.life-status { font-size: 14px; font-weight: 600; }
.life-date { font-size: 13px; color: var(--color-text-secondary); }
.life-node.current .life-status { font-weight: 700; }
.life-node.current .life-date { color: var(--color-primary); font-weight: 600; }
.detail-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
.meta-cell { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; background: var(--color-bg); border-radius: var(--radius-md); }
.meta-k { font-size: 11px; color: var(--color-text-tertiary); }
.meta-v { font-size: 14px; font-weight: 500; color: var(--color-text-primary); word-break: break-all; }

.meeting-list { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
.meeting-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
}
.meeting-head-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.meeting-datetime { display: flex; align-items: center; gap: 10px; min-width: 0; }
.meeting-date { font-size: 13px; font-weight: 600; }
.meeting-time { font-size: 12px; color: var(--color-text-secondary); }
.meeting-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.meeting-participants { margin-bottom: 10px; }
.meeting-participants .field-label { display: block; }
.meeting-participants p { margin: 0; font-size: 13px; white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
.meeting-participant-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.participant-chip {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;
  border: 1px solid; white-space: nowrap;
}
/* 记录纪要弹窗中的多选标签 */
.meeting-participant-picker { display: flex; flex-direction: column; gap: 2px; }
.participant-tags-select { display: flex; flex-wrap: wrap; gap: 6px; }
.participant-tag {
  display: inline-flex; align-items: center;
  padding: 4px 12px; border-radius: 14px; font-size: 12px; font-weight: 500;
  border: 1.5px solid var(--color-border); background: transparent;
  color: var(--color-text-secondary); cursor: pointer; transition: all 0.15s;
  user-select: none;
}
.participant-tag:hover { border-color: var(--color-primary); color: var(--color-primary); }
.participant-tag.selected { color: #fff; border-color: transparent; }
.participant-tag.selected:hover { opacity: 0.85; }
/* 模板配置弹窗中的参与人员管理 */
.participant-color-dot {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.8);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
  cursor: pointer; padding: 0; transition: transform 0.15s;
}
.participant-color-dot:hover { transform: scale(1.15); }
.participant-color-picker { display: flex; gap: 3px; flex-shrink: 0; }
.color-dot-btn {
  width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid transparent;
  cursor: pointer; padding: 0; transition: transform 0.15s;
}
.color-dot-btn:hover { transform: scale(1.2); }
.color-dot-btn.active { border-color: #fff; box-shadow: 0 0 0 1.5px rgba(0,0,0,0.3); }
/* 分组管理 */
.participant-groups-row {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 12px;
}
.participant-group-chip {
  display: inline-flex; align-items: center; gap: 2px;
  padding: 2px 6px; border-radius: 10px;
  background: var(--color-bg-secondary, #f0f2f5);
  border: 1px solid var(--color-border-light, #eef0f2);
}
.participant-group-name-input {
  border: none; background: transparent; padding: 2px 4px;
  font-size: 12px; font-weight: 500; width: auto; min-width: 40px;
}
.participant-group-name-input:focus { outline: none; }
.participant-group-section { margin-bottom: 12px; }
.participant-group-header {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
}
.participant-group-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.participant-group-count { font-size: 11px; color: var(--color-text-tertiary); }
.participant-group-select { width: auto; min-width: 70px; }
/* 颜色选择弹窗 */
.color-picker-popover {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: var(--color-bg-card, #fff); border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18); border: 1px solid var(--color-border);
  padding: 16px; min-width: 260px; z-index: 20;
}
.color-picker-section { margin-bottom: 12px; }
.color-picker-section:last-child { margin-bottom: 0; }
.color-picker-label { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 6px; }
.color-picker-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.color-picker-custom { display: flex; align-items: center; gap: 8px; }
.color-picker-custom input[type="color"] { width: 32px; height: 32px; border: none; border-radius: 50%; cursor: pointer; padding: 0; background: none; }
.color-picker-custom input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
.color-picker-custom input[type="color"]::-webkit-color-swatch { border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgba(0,0,0,0.15); }
.color-hex-text { font-size: 12px; color: var(--color-text-secondary); font-family: monospace; }
/* 记录纪要弹窗中按分组展示 */
.participant-select-group { margin-bottom: 6px; }
.participant-select-group-name { font-size: 11px; font-weight: 600; color: var(--color-text-tertiary); margin-bottom: 3px; display: block; }
.meeting-three { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.meeting-field {
  font-size: 13px;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  min-height: 0;
}
.field-label {
  font-weight: 600;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 0 0 2px;
  border-bottom: none;
}
.meeting-field p { margin: 0; padding: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.6; }

.milestone-timeline { position: relative; padding-left: 8px; }
.milestone-node {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  position: relative;
}
.milestone-node:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 36px;
  bottom: -12px;
  width: 2px;
  background: var(--color-border);
}
.milestone-node.completed:not(:last-child)::before { background: var(--color-success); }
.milestone-marker {
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 2px solid var(--color-border-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  background: white;
}
.milestone-node.completed .milestone-marker {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}
.milestone-node.active .milestone-marker {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}
.marker-check { font-size: 12px; }
.marker-pulse {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.milestone-info { flex: 1; }
.milestone-name { font-size: 14px; font-weight: 600; }
.milestone-date { font-size: 12px; color: var(--color-text-secondary); }
.milestone-date-label { font-size: 12px; color: var(--color-text-secondary); display: inline-flex; align-items: center; gap: 4px; margin-left: 4px; }
.milestone-countdown { font-size: 12px; color: var(--color-warning); font-weight: 600; }
.milestone-actions { display: flex; gap: 6px; align-items: center; }
.date-input {
  padding: 2px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

/* ===== 研究助手 ===== */
.assistant-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.assistant-card { padding: 18px; }
.assistant-wide { grid-column: 1 / -1; }
.assistant-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  margin-top: -8px;
}
.assistant-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.assistant-result {
  margin-top: 12px;
  padding: 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}
.result-label {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-bottom: 6px;
}
.result-text {
  font-size: 13px;
  color: var(--color-text-primary);
  line-height: 1.6;
}
.stage-pipeline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.pipeline-stage {
  padding: 12px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}
.stage-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.stage-name {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
}
.stage-progress {
  font-size: 11px;
  color: var(--color-text-tertiary);
}
.stage-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stage-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.stage-item input { margin-top: 2px; }
.check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.check-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.check-item.done { opacity: 0.7; }
.check-item input { margin-top: 2px; }
.check-title {
  font-size: 13px;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}
.input-xs {
  padding: 4px 8px;
  font-size: 12px;
}

@media (max-width: 1400px) {
  .meeting-list { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 1100px) {
  .meeting-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 800px) {
  .meeting-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px) {
  .meeting-list { grid-template-columns: repeat(1, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .assistant-grid { grid-template-columns: 1fr; }
  .assistant-wide { grid-column: 1; }
  .detail-meta-grid { grid-template-columns: 1fr; }
}

/* 组会纪要模板配置 */
.meeting-fields-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.meeting-field-row {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; background: var(--color-bg-secondary, #f8f9fa);
  border-radius: var(--radius-md, 6px); border: 1px solid var(--color-border-light, #eef0f2);
}
.field-sort { display: flex; flex-direction: column; gap: 1px; flex-shrink: 0; }
.field-sort .sort-btn {
  background: none; border: none; font-size: 10px; cursor: pointer;
  color: var(--color-text-tertiary, #9ca3af); padding: 0 2px; line-height: 1;
}
.field-sort .sort-btn:hover:not(:disabled) { color: var(--color-primary); }
.field-sort .sort-btn:disabled { opacity: 0.3; cursor: default; }
.field-toggle { flex-shrink: 0; }
.field-inputs { flex: 1; display: flex; gap: 6px; align-items: center; min-width: 0; }
.field-inputs .input { flex: 1; min-width: 0; }
</style>
