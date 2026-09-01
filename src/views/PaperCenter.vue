<template>
  <div class="paper-center-page">
    <!-- Tab 切换：胶囊样式 -->
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
      <!-- 第一行：各状态文献占比 + 文献数据 -->
      <div class="overview-grid">
        <div class="card section-card">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="bar-chart" />  各状态文献占比</h2>
            <span class="text-xs text-tertiary">悬停查看部分文献</span>
          </div>
          <div class="chart-wrap">
            <div ref="chartRef" class="chart-el"></div>
          </div>
          <div class="chart-legend">
            <div v-for="s in paperLibraryStore.sortedStatuses" :key="s.id" class="legend-item">
              <span class="legend-dot" :style="{ background: s.color }"></span>
              <span class="legend-name">{{ s.name }}</span>
              <span class="legend-count">{{ paperLibraryStore.statusSummary[s.id]?.count || 0 }}</span>
            </div>
          </div>
        </div>
        <div class="card section-card overview-right-col">
          <div class="card-header">
            <h2 class="card-title"><AppIcon name="file-text" />  文献数据</h2>
            <span class="text-xs text-tertiary">共 {{ paperLibraryStore.papers.length }} 篇</span>
          </div>
          <div class="overview-paper-groups">
            <div v-for="s in paperLibraryStore.sortedStatuses" :key="s.id" class="status-group"
              v-show="paperLibraryStore.statusSummary[s.id]?.count > 0">
              <div class="status-group-header" :style="{ color: s.color }">
                <span class="status-dot" :style="{ background: s.color }"></span>
                <span class="status-name">{{ s.name }}</span>
                <span class="status-count">{{ paperLibraryStore.statusSummary[s.id].count }} 篇</span>
              </div>
              <div class="status-paper-list">
                <div v-for="paper in paperLibraryStore.statusSummary[s.id].papers.slice(0, 5)" :key="paper.id"
                  class="status-paper-item" @click="openDetailPaper(paper)">
                  <span class="paper-title-sm">{{ paper.title }}</span>
                  <span v-if="paper.year" class="paper-meta-sm">{{ paper.year }}</span>
                  <span v-if="paper.journal" class="paper-meta-sm">{{ paper.journal }}</span>
                </div>
              </div>
            </div>
            <div v-if="paperLibraryStore.papers.length === 0" class="empty-state" style="padding: 40px 0;">
              <div class="empty-state-icon"><AppIcon name="file-text" /> </div>
              <p>暂无论文数据，切换到「论文列表」添加第一篇吧</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 第二行：最近笔记——独立整行 -->
      <div v-if="paperNotesStore.recentNotes.length > 0" class="card section-card" style="margin-top:20px;">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="file-edit" />  最近笔记</h2>
        </div>
        <div class="overview-notes-grid">
          <div v-for="note in paperNotesStore.recentNotes.slice(0, 5)" :key="note.id"
            class="overview-note-card" @click="openNoteDetail(note)">
            <span class="overview-note-card-title">{{ note.title }}</span>
            <span class="overview-note-card-preview">{{ stripHtmlTags(note.content).substring(0, 80) || '（无内容）' }}</span>
            <span class="overview-note-card-time">{{ formatNoteTime(note.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 论文阅读 -->
    <div v-if="activeTab === 'reading'" class="tab-content">
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="book-open" />  论文阅读列表</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="showReadingConfigModal = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              论文阅读设置
            </button>
            <div class="export-dropdown">
              <button class="header-btn" @click="toggleReadingExportMenu">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                导出
              </button>
              <div v-if="showReadingExportMenu" class="export-menu" @click.stop>
                <button @click="exportReadingsMarkdown"><AppIcon name="file-edit" />  导出 Markdown</button>
                <button @click="exportReadingsPdf"><AppIcon name="file-text" />  导出 PDF</button>
              </div>
            </div>
            <button class="header-btn header-btn-primary" @click="openAddReading">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加记录
            </button>
          </div>
        </div>

        <!-- 搜索栏 -->
        <div class="filter-bar">
          <div class="filter-search-row">
            <input class="input filter-search-full" v-model="readingSearchQuery" placeholder="搜索论文名、时间、标签..." style="border-radius:6px;" />
          </div>
          <div class="filter-bottom-row">
            <div class="sort-controls">
              <span class="sort-label">排序：</span>
              <GlassSelect
                v-model="readingSortField"
                @change="onReadingSortChange"
                style="width:120px;"
                select-class="input input-sm"
                size="sm"
                :options="[
                  { value: 'createdAt', label: '按添加时间' },
                  { value: 'title', label: '按标题' },
                  { value: 'year', label: '按年份' }
                ]"
              />
              <button class="btn btn-ghost btn-sm sort-dir-btn" @click="toggleReadingSortDir"
                :title="paperReadingsStore.sortDirection === 'desc' ? '降序 → 升序' : '升序 → 降序'">
                {{ paperReadingsStore.sortDirection === 'desc' ? '↓' : '↑' }}
              </button>
            </div>
            <div v-if="readingTagOptions.length > 0" class="filter-tags">
              <span class="filter-tags-label">标签：</span>
              <button v-for="tag in readingTagOptions" :key="tag" class="tag-chip"
                :class="{ active: readingFilterTags.includes(tag) }" @click="toggleReadingFilterTag(tag)"
                :style="readingFilterTags.includes(tag) ? { background: (paperLibraryStore.getTagColor(tag) || '#6B7280'), color: '#fff', borderColor: (paperLibraryStore.getTagColor(tag) || '#6B7280') } : { background: (paperLibraryStore.getTagColor(tag) || '#6B7280') + '15', color: (paperLibraryStore.getTagColor(tag) || '#6B7280'), borderColor: (paperLibraryStore.getTagColor(tag) || '#6B7280') + '40' }">
                {{ tag }}
              </button>
            </div>
            <button v-if="readingSearchQuery || readingFilterTags.length > 0" class="btn btn-ghost btn-sm filter-clear" @click="clearReadingFilters">✕ 清除筛选</button>
            <span class="filter-stats">显示 {{ filteredReadings.length }} / {{ paperReadingsStore.readings.length }} 条记录</span>
          </div>
        </div>

        <div class="paper-table-wrapper">
          <table class="paper-table">
            <thead>
              <tr>
                <th class="col-seq">#</th>
                <th v-for="col in readingColumnList" :key="col.key" :class="'col-reading-' + col.key">{{ col.label }}</th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, idx) in filteredReadings" :key="r.id" class="paper-row" @click="onReadingRowClick(r)">
                <td class="col-seq">{{ idx + 1 }}</td>
                <td v-for="col in readingColumnList" :key="col.key" :class="'col-reading-' + col.key" :title="readingCellTitle(r, col.key)">
                  <!-- 论文题目列 -->
                  <template v-if="col.key === 'title'">
                    <span class="reading-title-cell">{{ r.title || '-' }}</span>
                    <span v-if="r.paperId && getPaperTitle(r.paperId)" class="doi-badge" :title="'已链接论文列表文献：' + getPaperTitle(r.paperId)">链接</span>
                  </template>
                  <!-- 标签列 -->
                  <template v-else-if="col.key === 'tags'">
                    <span v-for="tag in (r.tags || []).slice(0, 3)" :key="tag" class="mini-tag" :style="tagStyle(tag)">{{ tag }}</span>
                    <span v-if="(r.tags || []).length > 3" class="mini-tag-more">+{{ r.tags.length - 3 }}</span>
                    <span v-if="!(r.tags || []).length" style="color:var(--color-text-tertiary);">-</span>
                  </template>
                  <!-- 通用列 -->
                  <template v-else>{{ r[col.key] || '-' }}</template>
                </td>
                <td class="col-actions" @click.stop>
                  <button class="btn btn-sm btn-ghost" @click="openEditReading(r)" title="编辑记录">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="deleteReading(r)" title="删除记录">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredReadings.length === 0 && paperReadingsStore.readings.length > 0" class="empty-state" style="padding: 40px 0;">
            <div class="empty-state-icon"><AppIcon name="search" /> </div>
            <p>没有匹配的阅读记录，尝试调整搜索关键词</p>
          </div>
          <div v-if="paperReadingsStore.readings.length === 0" class="empty-state" style="padding: 40px 0;">
            <div class="empty-state-icon"><AppIcon name="book-open" /> </div>
            <p>还没有论文阅读记录，点击右上角添加吧</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 论文列表 -->
    <div v-if="activeTab === 'library'" class="tab-content">
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="book" />  论文列表</h2>
          <div class="card-header-actions">
            <button class="header-btn" @click="showPaperConfigModal = true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              论文列表配置
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
            <button class="header-btn header-btn-primary" @click="openAddPaper">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加文献
            </button>
          </div>
        </div>

        <!-- 筛选栏 -->
        <div class="filter-bar">
          <div class="filter-search-row">
            <input class="input filter-search-full" v-model="searchQuery" placeholder="搜索论文标题、作者、期刊..." style="border-radius:6px;" />
          </div>
          <div class="filter-selects-row">
            <GlassSelect
              v-model="filterJournal"
              select-class="input filter-select-col"
              placeholder="全部期刊"
              :options="[
                { value: '', label: '全部期刊' },
                ...journalOptions.map(j => ({ value: j, label: j }))
              ]"
            />
            <GlassSelect
              v-model="filterYear"
              select-class="input filter-select-col"
              placeholder="全部年份"
              :options="[
                { value: '', label: '全部年份' },
                ...yearOptions.map(y => ({ value: y, label: y }))
              ]"
            />
            <GlassSelect
              v-model="filterStatus"
              select-class="input filter-select-col"
              placeholder="全部状态"
              :options="[
                { value: '', label: '全部状态' },
                ...paperLibraryStore.sortedStatuses.map(s => ({ value: s.id, label: s.name }))
              ]"
            />
            <GlassSelect
              v-model="searchField"
              select-class="input filter-select-col"
              :options="[
                { value: 'all', label: '搜索: 全部字段' },
                { value: 'title', label: '搜索: 标题' },
                { value: 'authors', label: '搜索: 作者' },
                { value: 'journal', label: '搜索: 期刊' },
                { value: 'unit', label: '搜索: 单位' },
                { value: 'tags', label: '搜索: 标签' },
                { value: 'doi', label: '搜索: DOI' }
              ]"
            />
            <button class="btn btn-primary btn-sm filter-refresh-btn" @click="refreshSearch" title="刷新搜索结果"><AppIcon name="search" />  搜索刷新</button>
          </div>
          <div class="filter-bottom-row">
            <div class="sort-controls">
              <span class="sort-label">排序：</span>
              <GlassSelect
                v-model="paperLibraryStore.sortOrder"
                @change="onSortChange"
                style="width:120px;"
                select-class="input input-sm"
                size="sm"
                :options="[
                  { value: 'created', label: '按创建时间' },
                  { value: 'alpha', label: '按字母排序' },
                  { value: 'custom', label: '自定义排序' }
                ]"
              />
              <GlassSelect
                v-if="paperLibraryStore.sortOrder === 'alpha'"
                v-model="paperLibraryStore.sortField"
                @change="onSortChange"
                style="width:100px;"
                select-class="input input-sm"
                size="sm"
                :options="[
                  { value: 'title', label: '按标题' },
                  { value: 'authors', label: '按作者' },
                  { value: 'journal', label: '按期刊' },
                  { value: 'year', label: '按年份' }
                ]"
              />
              <button class="btn btn-ghost btn-sm sort-dir-btn" @click="toggleSortDir" :title="paperLibraryStore.sortDirection === 'desc' ? '降序 → 升序' : '升序 → 降序'">
                {{ paperLibraryStore.sortDirection === 'desc' ? '↓' : '↑' }}
              </button>
            </div>
            <div v-if="tagOptions.length > 0" class="filter-tags">
              <span class="filter-tags-label">标签：</span>
              <button v-for="tag in tagOptions" :key="tag" class="tag-chip"
                :class="{ active: filterTags.includes(tag) }" @click="toggleFilterTag(tag)"
                :style="filterTags.includes(tag) ? { background: (paperLibraryStore.getTagColor(tag) || '#6B7280'), color: '#fff', borderColor: (paperLibraryStore.getTagColor(tag) || '#6B7280') } : { background: (paperLibraryStore.getTagColor(tag) || '#6B7280') + '15', color: (paperLibraryStore.getTagColor(tag) || '#6B7280'), borderColor: (paperLibraryStore.getTagColor(tag) || '#6B7280') + '40' }">
                {{ tag }}
              </button>
            </div>
            <button v-if="hasActiveFilters" class="btn btn-ghost btn-sm filter-clear" @click="clearFilters">✕ 清除筛选</button>
            <span class="filter-stats">显示 {{ filteredPapers.length }} / {{ paperLibraryStore.papers.length }} 篇文献</span>
          </div>
        </div>

        <div class="paper-table-wrapper" @wheel.passive="handleTableWheel">
          <table class="paper-table" ref="paperTableRef">
            <thead>
              <tr>
                <th class="col-seq" :style="{ width: columnWidths['_seq'] + 'px' || '40px' }">#
                  <span class="col-resize-handle" @mousedown.stop.prevent="startResize($event, '_seq')"></span>
                </th>
                <th v-for="col in orderedColumns" :key="col.key" :class="'col-' + col.key" :style="{ width: columnWidths[col.key] + 'px' || 'auto' }">
                  {{ col.label }}
                  <span class="col-resize-handle" @mousedown.stop.prevent="startResize($event, col.key)"></span>
                </th>
                <th class="col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(paper, idx) in filteredPapers" :key="paper.id" class="paper-row"
                :class="{ 'drag-over-row': dragOverRow && dragOverRow.id === paper.id, 'dragging-row': dragRow && dragRow.id === paper.id }"
                :draggable="paperLibraryStore.sortOrder === 'custom'"
                @dragstart="onDragRowStart($event, paper)"
                @dragover="onDragRowOver($event, paper)"
                @drop="onDragRowDrop($event, paper)"
                @dragend="onDragRowEnd"
                @click="onPaperRowClick(paper)">
                <td class="col-seq" :style="{ width: columnWidths['_seq'] + 'px' || '40px' }">
                  <span v-if="paperLibraryStore.sortOrder === 'custom'" class="drag-row-handle" title="拖拽排序">⋮⋮</span>
                  {{ idx + 1 }}
                </td>
                <td v-for="col in orderedColumns" :key="col.key" :class="'col-' + col.key" :style="{ width: columnWidths[col.key] + 'px' || 'auto' }" :title="getCellTitle(paper, col.key)" @click.stop="col.key === 'status' ? undefined : undefined">
                  <!-- 状态列 -->
                  <template v-if="col.key === 'status'">
                    <div class="status-badge-wrap">
                      <span class="status-badge" :style="statusBadgeStyle(paper.status)" @click.stop="toggleStatusPopup(paper, $event)">
                        {{ getStatusName(paper.status) }}
                      </span>
                    </div>
                    <Teleport to="body">
                      <div v-if="statusPopupId === paper.id" class="status-popup" :style="statusPopupStyle" @click.stop>
                        <div v-for="s in paperLibraryStore.sortedStatuses" :key="s.id"
                          class="status-popup-item" :class="{ active: s.id === paper.status }"
                          @click="updateStatus(paper, s.id); statusPopupId = null">
                          <span class="status-popup-dot" :style="{ background: s.color }"></span>
                          {{ s.name }}
                        </div>
                      </div>
                    </Teleport>
                  </template>
                  <!-- 标题列 -->
                  <template v-else-if="col.key === 'title'">
                    <span class="paper-title-cell">{{ paper.title }}</span>
                    <span v-if="paper.doi" class="doi-badge" :title="paper.doi">DOI</span>
                  </template>
                  <!-- 标签列 -->
                  <template v-else-if="col.key === 'tags'">
                    <span v-for="tag in (paper.tags || []).slice(0, 3)" :key="tag" class="mini-tag" :style="tagStyle(tag)">{{ tag }}</span>
                    <span v-if="(paper.tags || []).length > 3" class="mini-tag-more">+{{ paper.tags.length - 3 }}</span>
                    <span v-if="!(paper.tags || []).length" style="color:var(--color-text-tertiary);">-</span>
                  </template>
                  <!-- 影响列 -->
                  <template v-else-if="col.key === 'impact'">
                    <div class="impact-badges">
                      <span v-for="(b, bi) in parseImpact(paper.impact)" :key="bi" class="impact-badge" :style="b.style">{{ b.text }}</span>
                      <span v-if="!parseImpact(paper.impact).length" style="color:var(--color-text-tertiary);">-</span>
                    </div>
                  </template>
                  <!-- 主要内容列 -->
                  <template v-else-if="col.key === 'mainContent'">{{ truncate(paper.mainContent, 40) || '-' }}</template>
                  <!-- 创新点列 -->
                  <template v-else-if="col.key === 'innovation'">{{ truncate(paper.innovation, 40) || '-' }}</template>
                  <!-- 通用列（作者/年份/期刊/单位/影响/自定义字段） -->
                  <template v-else>{{ paper[col.key] || '-' }}</template>
                </td>
                <td class="col-actions" @click.stop>
                  <button class="btn btn-sm btn-ghost" @click="openEditPaper(paper)" title="编辑文献">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button v-if="paper.pdfFileName" class="btn btn-sm btn-ghost" @click="openPaperPdfExternal(paper)" title="打开 PDF">
                    <AppIcon name="file-text" />
                  </button>
                  <button class="btn btn-sm btn-ghost" @click="deletePaper(paper)" title="删除文献">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredPapers.length === 0 && paperLibraryStore.papers.length > 0" class="empty-state" style="padding: 40px 0;">
            <div class="empty-state-icon"><AppIcon name="search" /> </div>
            <p>没有匹配的文献，尝试调整筛选条件</p>
          </div>
          <div v-if="paperLibraryStore.papers.length === 0" class="empty-state" style="padding: 40px 0;">
            <div class="empty-state-icon"><AppIcon name="book" /> </div>
            <p>还没有文献记录，点击右上角添加吧</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 论文笔记（重构：左侧树状文件夹 + 右侧全高编辑器） -->
    <div v-if="activeTab === 'notes'" class="tab-content">
      <div class="notes-layout-v2">
        <!-- 左侧树 -->
        <div class="notes-tree-panel card section-card">
          <div class="card-header" style="padding-bottom:10px;">
            <h2 class="card-title"><AppIcon name="folder" />  笔记管理</h2>
            <div style="display:flex; gap:6px;">
              <button class="tree-add-btn" @click="startNewFolder('')" title="新建文件夹">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              </button>
              <button class="tree-add-btn" @click="openNewNote" title="新建笔记">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </button>
            </div>
          </div>
          <input class="input input-sm" v-model="notesSearch" placeholder="搜索笔记标题..." style="margin-bottom:8px;" />

          <!-- 树形结构 -->
          <div class="notes-tree">
            <!-- 未分类 -->
            <div class="tree-folder" :class="{ active: currentFolder === '__uncategorized' }">
              <div class="tree-folder-header">
                <span class="tree-arrow" :class="{ expanded: expandedFolders.has('__uncategorized') }"
                  @click.stop="toggleFolder('__uncategorized')">▸</span>
                <span @click="selectFolder('__uncategorized')" style="flex:1;"><AppIcon name="folder-open" />  未分类</span>
                <span class="tree-count">{{ paperNotesStore.notesInFolder('__uncategorized').length }}</span>
              </div>
              <div v-if="expandedFolders.has('__uncategorized')" class="tree-sub">
                <div v-for="note in paperNotesStore.notesInFolder('__uncategorized')" :key="note.id" class="tree-note-item"
                  :class="{ active: editingNoteId === note.id }"
                  :draggable="true"
                  @dragstart="onDragNoteStart($event, note)"
                  @click="openNoteEdit(note)" @dblclick="openNoteEdit(note)"
                  :title="note.title">
                  <span class="tree-note-icon"><AppIcon name="file-edit" /> </span>
                  <span class="tree-note-title">{{ note.title }}</span>
                  <span class="tree-note-time">{{ formatNoteTime(note.updatedAt) }}</span>
                  <button class="tree-action-btn" @click.stop="deleteNote(note)" title="删除"><AppIcon name="trash" /> </button>
                </div>
                <div v-if="paperNotesStore.notesInFolder('__uncategorized').length === 0" class="tree-empty">暂无笔记</div>
              </div>
            </div>

            <!-- 根文件夹递归 -->
            <template v-for="folder in paperNotesStore.rootFolders" :key="folder.id">
              <div class="tree-folder" :class="{ active: currentFolder === folder.id }">
                <div class="tree-folder-header" @click="selectFolder(folder.id)"
                  :class="{ 'tree-folder-dragover': dragOverFolder === folder.id }"
                  @dragover.prevent="dragOverFolder = folder.id"
                  @dragleave="dragOverFolder = null"
                  @drop.prevent="handleDropNote(folder.id)">
                  <span class="tree-arrow" :class="{ expanded: expandedFolders.has(folder.id) }"
                    @click.stop="toggleFolder(folder.id)">▸</span>
                  <template v-if="renamingFolder === folder.id">
                    <input class="tree-rename-input" v-model="renameText"
                      @keydown.enter="finishRename(folder.id)"
                      @keydown.escape="renamingFolder = null"
                      @blur="finishRename(folder.id)"
                      @click.stop autofocus />
                  </template>
                  <template v-else>
                    <span @dblclick.stop="startRename(folder)" style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><AppIcon name="folder" />  {{ folder.name }}</span>
                    <span class="tree-count">{{ paperNotesStore.notesInFolder(folder.id).length }}</span>
                    <button class="tree-action-btn" @click.stop="startNewFolder(folder.id)" title="新建子文件夹">＋</button>
                    <button class="tree-action-btn" @click.stop="startRename(folder)" title="重命名"><AppIcon name="pencil" /> </button>
                    <button class="tree-action-btn" @click.stop="deleteFolderConfirm(folder)" title="删除"><AppIcon name="trash" /> </button>
                  </template>
                </div>

                <!-- 子文件夹 -->
                <div v-if="expandedFolders.has(folder.id)" class="tree-sub">
                  <div v-for="cf in paperNotesStore.childFolders(folder.id)" :key="cf.id"
                    class="tree-folder tree-sub-folder"
                    :class="{ active: currentFolder === cf.id }"
                    @dragover.prevent="dragOverFolder = cf.id"
                    @dragleave="dragOverFolder = null"
                    @drop.prevent="handleDropNote(cf.id)">
                    <div class="tree-folder-header" @click="selectFolder(cf.id)">
                      <span><AppIcon name="folder-open" />  {{ cf.name }}</span>
                      <span class="tree-count">{{ paperNotesStore.notesInFolder(cf.id).length }}</span>
                      <button class="tree-action-btn" @click.stop="startRename(cf)" title="重命名"><AppIcon name="pencil" /> </button>
                      <button class="tree-action-btn" @click.stop="deleteFolderConfirm(cf)" title="删除"><AppIcon name="trash" /> </button>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 笔记列表（当前选中文件夹下的笔记） -->
            <div class="tree-notes-section">
              <div v-for="note in currentFolderNotes" :key="note.id" class="tree-note-item"
                :class="{ active: editingNoteId === note.id }"
                :draggable="true"
                @dragstart="onDragNoteStart($event, note)"
                @click="openNoteEdit(note)" @dblclick="openNoteEdit(note)"
                :title="note.title">
                <span class="tree-note-icon"><AppIcon name="file-edit" /> </span>
                <span class="tree-note-title">{{ note.title }}</span>
                <span class="tree-note-time">{{ formatNoteTime(note.updatedAt) }}</span>
                <button class="tree-action-btn" @click.stop="deleteNote(note)" title="删除"><AppIcon name="trash" /> </button>
              </div>
              <div v-if="currentFolderNotes.length === 0 && !notesSearch" class="tree-empty">
                暂无笔记
              </div>
            </div>
          </div>
        </div>

        <!-- 中间：笔记导航大纲 -->
        <div v-if="showNoteEditor || editingNoteId" class="notes-outline-panel card section-card">
          <div class="card-header" style="padding-bottom:10px;">
            <h3 class="card-title"><AppIcon name="compass" />  导航</h3>
          </div>
          <div class="outline-list">
            <div v-for="(item, idx) in noteOutline" :key="idx" class="outline-item" :class="'level-' + item.level" @click="scrollToHeading(idx)">
              {{ item.text }}
            </div>
            <div v-if="!noteOutline.length" class="outline-empty">暂无标题，<br/>使用 H1-H3 添加后将显示在此</div>
          </div>
        </div>

        <!-- 右侧编辑器（全高） -->
        <div class="notes-editor-panel-v2 card section-card" v-if="showNoteEditor || editingNoteId">
          <div class="note-editor-header" style="flex-shrink:0;">
            <input class="input note-title-input" v-model="noteForm.title" placeholder="笔记标题" />
            <div class="header-actions">
              <button class="soft-btn soft-btn-primary" @click="saveNote" title="保存笔记">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                保存
              </button>
              <button class="soft-btn-close" @click="closeNoteEditor" title="关闭">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <!-- 元信息行：关联文献 + 分类 -->
          <div class="note-editor-meta-row" style="flex-shrink:0;">
            <GlassSelect
              v-model="noteForm.paperId"
              title="关联文献"
              select-class="input input-sm note-meta-select"
              size="sm"
              placeholder="不关联论文"
              :options="[
                { value: '', label: '不关联论文' },
                ...paperLibraryStore.papers.map(p => ({ value: p.id, label: p.title }))
              ]"
            />
            <GlassSelect
              v-model="noteForm.folderId"
              title="分类"
              select-class="input input-sm note-meta-select"
              size="sm"
              placeholder="未分类"
              :options="[
                { value: '', label: '未分类' },
                ...allFoldersFlat.map(f => ({ value: f.id, label: f.name }))
              ]"
            />
          </div>

          <!-- Word 风格工具栏 v2 -->
          <div class="note-editor-toolbar-row-v2" style="flex-shrink:0;">
            <div class="word-toolbar-v2" @mousedown="preventToolbarFocus">
              <div class="wt-group">
                <button class="wt-btn wt-btn-icon" title="撤销" @click="execCmd('undo')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="重做" @click="execCmd('redo')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
                </button>
              </div>
              <div class="wt-group">
                <GlassSelect
                  title="样式"
                  select-class="wt-btn wt-btn-select"
                  @change="applyHeadingStyle"
                  :options="[
                    { value: '', label: '正文' },
                    { value: 'h1', label: '标题 1' },
                    { value: 'h2', label: '标题 2' },
                    { value: 'h3', label: '标题 3' },
                    { value: 'h4', label: '标题 4' },
                    { value: 'h5', label: '标题 5' }
                  ]"
                />
              </div>
              <div class="wt-group">
                <GlassSelect
                  v-model="currentFontSize"
                  @change="applyFontSize"
                  title="字号"
                  select-class="wt-btn wt-btn-select"
                  :options="fontSizeOptions.map(sz => ({ value: sz.value, label: sz.label }))"
                />
              </div>
              <div class="wt-group">
                <button class="wt-btn wt-btn-icon" title="加粗" @click="insertHtmlTag('strong')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="斜体" @click="insertHtmlTag('em')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="下划线" @click="insertHtmlTag('u')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="删除线" @click="insertHtmlTag('del')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><text x="4" y="14" font-size="11" font-weight="600" fill="currentColor" stroke="none">ab</text><line x1="2" y1="16" x2="21" y2="10"/></svg>
                </button>
              </div>
              <div class="wt-group">
                <button class="wt-btn wt-btn-icon" title="上标" @click="insertHtmlTag('sup')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><text x="3" y="14" font-size="10" fill="currentColor" stroke="none">X</text><text x="12" y="8" font-size="7" fill="currentColor" stroke="none">2</text></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="下标" @click="insertHtmlTag('sub')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><text x="3" y="14" font-size="10" fill="currentColor" stroke="none">X</text><text x="12" y="18" font-size="7" fill="currentColor" stroke="none">2</text></svg>
                </button>
              </div>
              <div class="wt-group wt-group-last">
                <!-- 文字颜色 -->
                <div class="wt-color-wrap">
                  <button class="wt-btn wt-btn-color" title="文字颜色" @click="toggleColorPicker('text')">
                    <span class="wt-color-a">A</span>
                    <span class="wt-color-bar" :style="{ background: currentTextColor }"></span>
                  </button>
                  <div v-if="activeColorPicker === 'text'" class="office-color-panel" @click.stop>
                    <div class="ocp-section">
                      <div class="ocp-section-title">自动</div>
                      <div class="ocp-auto" @click="applyTextColor(''); activeColorPicker = null">
                        <span class="ocp-auto-a" :style="{ color: 'inherit' }">A</span>
                        <span>自动(A)</span>
                      </div>
                    </div>
                    <div class="ocp-section">
                      <div class="ocp-section-title">主题颜色</div>
                      <div class="ocp-theme-grid">
                        <span v-for="c in themeColors" :key="c" class="ocp-swatch" :style="{ background: c }" @click="applyTextColor(c); activeColorPicker = null" :title="c"></span>
                      </div>
                    </div>
                    <div class="ocp-section">
                      <div class="ocp-section-title">标准色</div>
                      <div class="ocp-standard-row">
                        <span v-for="c in standardColors" :key="c" class="ocp-swatch" :style="{ background: c }" @click="applyTextColor(c); activeColorPicker = null" :title="c"></span>
                      </div>
                    </div>
                    <div class="ocp-footer">
                      <label class="ocp-more">
                        <span>其他颜色(M)...</span>
                        <input type="color" v-model="customTextColor" @change="applyTextColor(customTextColor); activeColorPicker = null" style="position:absolute;opacity:0;width:100%;height:100%;left:0;top:0;cursor:pointer;" />
                      </label>
                    </div>
                  </div>
                </div>
                <!-- 高亮颜色 -->
                <div class="wt-color-wrap">
                  <button class="wt-btn wt-btn-color" title="突出显示文本" @click="toggleColorPicker('highlight')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7a2.8 2.8 0 0 0-4-4l-7 7"/><path d="M10 13 3 20"/><path d="M14 15l-2 2"/><path d="m20 21-2-2"/></svg>
                    <span class="wt-color-bar" :style="{ background: currentHighlightColor }"></span>
                  </button>
                  <div v-if="activeColorPicker === 'highlight'" class="office-color-panel" @click.stop>
                    <div class="ocp-section">
                      <div class="ocp-section-title">无颜色</div>
                      <div class="ocp-auto" @click="applyHighlightColor('transparent'); activeColorPicker = null">
                        <span class="ocp-none-box" style="border-color:var(--color-text-secondary);"></span>
                        <span>无颜色(N)</span>
                      </div>
                    </div>
                    <div class="ocp-section">
                      <div class="ocp-section-title">主题颜色</div>
                      <div class="ocp-theme-grid">
                        <span v-for="c in themeColors" :key="c" class="ocp-swatch" :style="{ background: c }" @click="applyHighlightColor(c); activeColorPicker = null" :title="c"></span>
                      </div>
                    </div>
                    <div class="ocp-section">
                      <div class="ocp-section-title">标准色</div>
                      <div class="ocp-standard-row">
                        <span v-for="c in standardColors" :key="c" class="ocp-swatch" :style="{ background: c }" @click="applyHighlightColor(c); activeColorPicker = null" :title="c"></span>
                      </div>
                    </div>
                    <div class="ocp-footer">
                      <label class="ocp-more">
                        <span>其他颜色(M)...</span>
                        <input type="color" v-model="customHighlightColor" @change="applyHighlightColor(customHighlightColor); activeColorPicker = null" style="position:absolute;opacity:0;width:100%;height:100%;left:0;top:0;cursor:pointer;" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="wt-group">
                <button class="wt-btn wt-btn-icon" title="无序列表" @click="insertHtmlLine('<ul>\n  <li>', '</li>\n</ul>')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="有序列表" @click="insertHtmlLine('<ol>\n  <li>', '</li>\n</ol>')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><text x="2" y="9" font-size="9" font-weight="700" fill="currentColor" stroke="none">1</text><text x="2" y="15" font-size="9" font-weight="700" fill="currentColor" stroke="none">2</text></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="增加缩进" @click="execCmd('indent')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="11 9 14 12 11 15"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="减少缩进" @click="execCmd('outdent')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="13 9 10 12 13 15"/></svg>
                </button>
              </div>
              <div class="wt-group">
                <button class="wt-btn wt-btn-icon" :class="{ 'wt-btn-active': activeAlign === 'left' }" title="左对齐" @click="applyAlign('justifyLeft')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" :class="{ 'wt-btn-active': activeAlign === 'center' }" title="居中对齐" @click="applyAlign('justifyCenter')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" :class="{ 'wt-btn-active': activeAlign === 'right' }" title="右对齐" @click="applyAlign('justifyRight')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
                </button>
              </div>
              <div class="wt-group">
                <button class="wt-btn wt-btn-icon" title="引用" @click="insertHtmlLine('<blockquote>', '</blockquote>')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="6" y2="18"/><path d="M6 6h14v3H6z"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="链接" @click="insertHtmlTag('a', ' href=&quot;https://&quot;')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="行内代码" @click="insertHtmlTag('code')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                </button>
                <button class="wt-btn wt-btn-icon" title="分隔线" @click="insertHtmlBlock('<hr/>')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="12" x2="20" y2="12"/></svg>
                </button>
              </div>
              <div class="wt-group">
                <div class="wt-color-wrap">
                  <button class="wt-btn wt-btn-icon" :class="{ 'wt-btn-active': showSymbolPanel }" title="特殊符号" @click="toggleSymbolPanel">
                    <span style="font-size:15px;font-weight:600;">Ω</span>
                  </button>
                  <div v-if="showSymbolPanel" class="symbol-panel" @click.stop>
                    <div v-for="grp in symbolGroups" :key="grp.title" class="symbol-group">
                      <div class="symbol-group-title">{{ grp.title }}</div>
                      <div class="symbol-grid">
                        <button v-for="sym in grp.symbols" :key="sym" class="symbol-btn" :title="sym" @click="insertSymbol(sym)">{{ sym }}</button>
                      </div>
                    </div>
                  </div>
                </div>
                <button class="wt-btn wt-btn-icon" :class="{ 'wt-btn-active': showFormulaInput }" title="插入公式" @click="toggleFormulaInput">
                  <span style="font-size:14px;font-style:italic;">∑</span>
                </button>
              </div>
            </div>
          </div>

          <!-- A4 编辑区域 -->
          <div class="note-editor-body-v2 a4-wrapper">
            <div class="a4-page" :style="{ zoom: editorZoom }">
              <div ref="noteEditorRef" class="note-editor-contenteditable"
                contenteditable="true"
                @input="onNoteEditorInput"
                @keydown.tab.prevent="insertTab()"
                data-placeholder="在此输入笔记内容，选中文字后使用工具栏设置格式..."></div>
            </div>
          </div>
          <div class="note-editor-footer">
            <span class="note-autosave-status" :class="{ 'is-active': noteAutoSaveStatus }">{{ noteAutoSaveStatus || '准备就绪' }}</span>
            <div class="zoom-control">
              <button class="wt-btn wt-btn-icon" @click="editorZoom = Math.max(0.5, editorZoom - 0.1)" title="缩小">−</button>
              <span class="zoom-value">{{ Math.round(editorZoom * 100) }}%</span>
              <button class="wt-btn wt-btn-icon" @click="editorZoom = Math.min(1.5, editorZoom + 0.1)" title="放大">+</button>
            </div>
          </div>
        </div>

        <!-- 公式弹窗 -->
        <div v-if="showFormulaInput" class="formula-modal-overlay" @click.self="showFormulaInput = false">
          <div class="formula-modal">
            <div class="formula-modal-head">
              <h3 class="formula-modal-title">公式</h3>
              <button class="soft-btn-close" @click="showFormulaInput = false" title="关闭">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="formula-modal-body">
              <!-- 左侧：常用公式 -->
              <div class="formula-modal-left">
                <div class="fw-section">
                  <div class="fw-section-title">常用符号</div>
                  <div class="fw-symbol-grid">
                    <button v-for="sym in formulaWysiwygSymbols" :key="sym" class="fw-symbol-btn" :title="sym" @click="insertFormulaWysiwyg(sym)">{{ sym }}</button>
                  </div>
                </div>
                <div class="fw-section">
                  <div class="fw-section-title">常用结构</div>
                  <div class="fw-structure-grid">
                    <button v-for="st in formulaWysiwygStructures" :key="st.name" class="fw-structure-btn" :title="st.name" @click="insertFormulaWysiwyg(st.latex)">
                      <span class="fw-structure-preview" v-html="st.preview"></span>
                    </button>
                  </div>
                </div>
              </div>
              <!-- 右侧：LaTeX 输入 -->
              <div class="formula-modal-right">
                <div class="form-hint" style="margin-bottom:8px; font-size:12px; color:var(--color-text-secondary);">LaTeX 代码（如 E=mc^2, \frac{a}{b}, \sqrt{x}）</div>
                <textarea class="input input-sm" v-model="formulaLatex" rows="5" placeholder="E=mc^2" style="width:100%; font-family:'Consolas','Courier New',monospace; resize:vertical; margin-bottom:8px; flex:1; min-height:80px;"></textarea>
                <div v-if="formulaPreview" class="formula-preview-box" v-html="formulaPreview" style="margin-bottom:8px;"></div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-ghost btn-sm" style="flex:1;" @click="formulaLatex=''">清空</button>
                  <button class="btn btn-primary btn-sm" style="flex:2;" @click="insertFormula">插入公式</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态占位 -->
        <div v-if="!(showNoteEditor || editingNoteId)" class="notes-editor-panel-v2 card section-card" style="display:flex; align-items:center; justify-content:center; grid-column: 2 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon"><AppIcon name="folder" /> </div>
            <p>选择左侧文件夹中的笔记开始编辑<br/>或点击 <AppIcon name="file-edit" /> + 创建新笔记</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑文献弹窗 -->
    <div v-if="showPaperModal" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, closePaperModal)">
      <div class="modal-content" style="max-width: 680px; max-height: 88vh; overflow-y: auto;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">{{ editingPaper ? '编辑文献' : '添加文献' }}</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-primary" @click="savePaper" :title="editingPaper ? '保存' : '添加'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ editingPaper ? '保存' : '添加' }}
              </button>
              <button class="soft-btn-close" @click="closePaperModal" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">

            <!-- PDF 文件关联 -->
            <div class="form-group">
              <label class="form-label"><AppIcon name="file-text" />  PDF 文件</label>
              <div v-if="paperForm.pdfFileName" class="pdf-linked-row">
                <span class="pdf-linked-name"><AppIcon name="file-text" />  {{ paperForm.pdfFileName }}</span>
                <button class="btn btn-ghost btn-sm" type="button" @click="removePaperPdf" title="取消关联"><AppIcon name="x" />  移除</button>
              </div>
              <div v-else class="input-with-btn">
                <input type="file" ref="pdfLinkInput" accept=".pdf" @change="linkPdfParse ? handlePdfUpload($event) : handlePdfLinkOnly($event)" style="display:none;" />
                <button class="btn btn-ghost btn-sm" type="button" @click="triggerLinkPdf" :disabled="pdfLoading" style="width:100%; text-align:center; border:1px dashed var(--color-border); padding:10px; border-radius:var(--radius-md);">
                  {{ pdfLoading ? ' 正在处理 PDF...' : '点击选择 PDF 文件，自动保存到本地并可一键打开' }}
                </button>
              </div>
              <label v-if="!paperForm.pdfFileName" class="pdf-parse-check">
                <input type="checkbox" v-model="linkPdfParse" /> 同时自动解析并填充论文信息
              </label>
              <div v-if="pdfHint" class="form-hint" :style="{ color: pdfHintOk ? 'var(--color-success)' : 'var(--color-text-tertiary)' }">{{ pdfHint }}</div>
            </div>

            <!-- 动态表单字段 -->
            <template v-for="field in enabledFormFields" :key="field.key">
              <!-- DOI -->
              <div v-if="field.type === 'doi'" class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <div class="input-with-btn">
                  <input class="input flex-1" v-model="paperForm.doi" placeholder="如 10.1000/xyz123" @keyup.enter="fetchDoi" />
                  <button class="btn btn-ghost btn-sm doi-btn" @click="fetchDoi" :disabled="doiLoading">
                    {{ doiLoading ? ' 获取中...' : '自动获取' }}
                  </button>
                </div>
              </div>

              <!-- 期刊名称 + IF 查询 -->
              <div v-else-if="field.type === 'journal-if'" class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">年份</label>
                  <input class="input" v-model="paperForm.year" placeholder="如 2024" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">期刊名称</label>
                  <div class="input-with-btn">
                    <input class="input flex-1" v-model="paperForm.journal" placeholder="输入期刊名称自动查询影响因子" @blur="onJournalBlur" @keyup.enter="fetchJournalImpact" />
                    <button class="btn btn-ghost btn-sm doi-btn" @click="fetchJournalImpact" :disabled="journalLoading" :title="easyscholarKey ? '手动查询影响因子' : '请先在平台设置中配置 easyScholar Secret Key'">
                      {{ journalLoading ? '' : 'IF' }}
                    </button>
                  </div>
                  <div v-if="journalResult" class="form-hint" style="margin-top:4px; display:flex; flex-wrap:wrap; gap:4px 10px; align-items:center;">
                    <span v-if="journalResult.sciif" class="if-badge">IF={{ journalResult.sciif }}</span>
                    <span v-if="journalResult.sci" class="if-badge">JCR: {{ journalResult.sci }}</span>
                    <span v-if="journalResult.sciUp" class="if-badge">中科院: {{ journalResult.sciUp }}</span>
                    <span v-if="journalResult.sciUpTop === '是'" class="if-badge if-badge-top">TOP</span>
                    <span v-if="journalResult.cssci" class="if-badge" style="background:#fef3c7;color:#92400e;">CSSCI: {{ journalResult.cssci }}</span>
                    <span v-if="journalResult.pku" class="if-badge" style="background:#fce7f3;color:#9d174d;">北大核心: {{ journalResult.pku }}</span>
                  </div>
                  <div v-if="journalError" class="form-hint" style="color:var(--color-danger); margin-top:4px;">{{ journalError }}</div>
                </div>
              </div>

              <!-- 单位 + 影响（grouped） -->
              <div v-else-if="field.type === 'text' && field.groupWith === 'impact'" class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">单位</label>
                  <input class="input" v-model="paperForm.unit" placeholder="学校/机构" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">影响</label>
                  <input class="input" v-model="paperForm.impact" placeholder="影响因子 / 分区 / 引用" />
                </div>
              </div>

              <!-- 普通文本（跳过已 group 处理过的） -->
              <div v-else-if="field.type === 'text' && !field.groupWith && field.key !== 'year' && field.key !== 'journal'" class="form-group">
                <label class="form-label">{{ field.label }}<span v-if="field.required" class="required"> *</span></label>
                <input class="input" v-model="paperForm[field.key]" :placeholder="'请输入' + field.label" />
              </div>

              <!-- textarea -->
              <div v-else-if="field.type === 'textarea'" class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <textarea class="input" v-model="paperForm[field.key]" :placeholder="'请输入' + field.label" rows="3"></textarea>
              </div>

              <!-- 标签 -->
              <div v-else-if="field.type === 'tags'" class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <div class="tag-input-container">
                  <div class="tag-input-wrap" :class="{ 'has-suggest': showTagSuggest && (availableTags.length || (newTagInput.trim() && !paperLibraryStore.allTags().includes(newTagInput.trim()))) }">
                    <span v-for="(tag, i) in (paperForm.tags || [])" :key="'sel-'+i" class="tag-input-chip" :style="tagStyle(tag)">
                      <span class="tag-color-dot" :style="{ background: paperLibraryStore.getTagColor(tag) || '#6B7280' }"></span>
                      {{ tag }}
                      <button class="tag-remove" @click="removeFormTag(i)">×</button>
                    </span>
                    <input class="tag-input-field" v-model="newTagInput" placeholder="选择或输入标签，回车创建"
                      @focus="showTagSuggest = true"
                      @input="showTagSuggest = true"
                      @keydown.enter.prevent="addFormTag"
                      @keydown.backspace="handleTagBackspace"
                      @keydown.esc="showTagSuggest = false"
                      @blur="onTagInputBlur" />
                  </div>
                  <div v-if="showTagSuggest && (availableTags.length || (newTagInput.trim() && !paperLibraryStore.allTags().includes(newTagInput.trim())))" class="tag-suggest-panel">
                    <template v-if="availableTags.length">
                      <div class="tag-suggest-title">已有标签（点击选择）</div>
                      <div class="tag-suggest-list">
                        <button v-for="tag in availableTags" :key="tag" type="button" class="tag-suggest-item" :style="tagStyle(tag)" @mousedown.prevent="toggleFormTag(tag)">
                          <span class="tag-color-dot" :style="{ background: paperLibraryStore.getTagColor(tag) || '#6B7280' }"></span>
                          {{ tag }}
                        </button>
                      </div>
                    </template>
                    <button v-if="newTagInput.trim() && !paperLibraryStore.allTags().includes(newTagInput.trim())" type="button" class="tag-suggest-create" @mousedown.prevent="addFormTag">
                      <AppIcon name="plus" /> 创建标签「{{ newTagInput.trim() }}」
                    </button>
                  </div>
                </div>
                <div class="form-hint">可点击选择已有标签，或直接输入后回车创建新标签；颜色在「论文列表配置 → 标签颜色管理」中设置</div>
              </div>

              <!-- 状态 -->
              <div v-else-if="field.type === 'status'" class="form-group">
                <label class="form-label">{{ field.label }}</label>
                <GlassSelect
                  v-model="paperForm.status"
                  select-class="input"
                  :options="paperLibraryStore.sortedStatuses.map(s => ({ value: s.id, label: s.name }))"
                />
              </div>
            </template>

            <!-- 底部仅保留删除 -->
            <div style="display: flex; gap: 8px; justify-content: space-between; margin-top: 4px;">
              <button v-if="editingPaper" class="btn btn-danger btn-sm" @click="deletePaper(editingPaper)"><AppIcon name="trash" />  删除</button>
              <span v-else></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 论文列表配置弹窗（v5.0.123 从「平台设置」迁移至此） ==================== -->
    <div v-if="showPaperConfigModal" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showPaperConfigModal = false })">
      <div class="modal-content config-modal">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title"><AppIcon name="settings" />  论文列表配置</h3>
            <button class="soft-btn-close" @click="showPaperConfigModal = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <p class="text-xs text-tertiary" style="margin-bottom: 16px;">配置论文状态、添加文献表单字段、表格列显示与标签颜色。修改即时生效。</p>

          <div class="cfg-grid">
            <!-- 论文列表状态管理 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
                论文列表状态管理
              </h4>
              <div class="cfg-list">
                <div v-for="(s, i) in paperStatusList" :key="s.id" class="cfg-item">
                  <input type="color" class="cfg-color" :value="s.color" @input="e => paperLibraryStore.updateStatus(s.id, { color: e.target.value })" title="颜色" />
                  <input class="input cfg-name" :value="s.name" @input="e => paperLibraryStore.updateStatus(s.id, { name: e.target.value })" placeholder="状态名称" />
                  <button class="soft-btn-icon" @click="paperLibraryStore.reorderStatuses(i, i - 1)" :disabled="i === 0" title="上移">↑</button>
                  <button class="soft-btn-icon" @click="paperLibraryStore.reorderStatuses(i, i + 1)" :disabled="i === paperStatusList.length - 1" title="下移">↓</button>
                  <button class="soft-btn-icon danger" @click="deletePaperStatusCfg(s)" title="删除">✕</button>
                </div>
                <button class="soft-btn btn-sm" @click="addPaperStatusCfg">+ 添加状态</button>
              </div>
            </div>

            <!-- 添加文献表单字段 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
                添加文献表单字段
              </h4>
              <div class="cfg-list">
                <label v-for="f in paperLibraryStore.formFields" :key="f.key" class="cfg-toggle">
                  <input type="checkbox" :checked="f.enabled" :disabled="f.fixed" @change="togglePaperFormFieldCfg(f)" />
                  <span>{{ f.label }}<span v-if="f.required" style="color:var(--color-danger);"> *</span></span>
                  <span v-if="f.fixed" class="cfg-tag">必选</span>
                </label>
                <div class="cfg-subhead">自定义字段</div>
                <label v-for="cf in paperLibraryStore.customFields" :key="cf.key" class="cfg-toggle">
                  <input type="checkbox" :checked="cf.enabled" @change="toggleCustomFormFieldCfg(cf)" />
                  <span>{{ cf.label }}</span>
                  <button class="soft-btn-icon danger" @click="deleteCustomFieldCfg(cf)" title="删除">✕</button>
                </label>
                <div style="display:flex; gap:6px; margin-top: 4px;">
                  <input class="input" v-model="newCustomFieldName" placeholder="新字段名称" style="flex:1;" />
                  <GlassSelect
                    v-model="newCustomFieldType"
                    style="width:96px;"
                    select-class="input"
                    :options="[
                      { value: 'text', label: '文本' },
                      { value: 'number', label: '数字' },
                      { value: 'textarea', label: '多行' }
                    ]"
                  />
                  <button class="soft-btn btn-sm" @click="addCustomFormFieldCfg">+ 添加</button>
                </div>
                <button class="soft-btn-ghost btn-sm" style="margin-top:6px;" @click="resetPaperFormFieldsCfg">恢复表单字段默认</button>
              </div>
            </div>

            <!-- 论文列表表格列显示 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                论文列表表格列显示
              </h4>
              <div class="cfg-list">
                <div v-for="(col, i) in paperColumnList" :key="col.key" class="cfg-item">
                  <input type="checkbox" :checked="paperColumnVisibleCfg(col.key)" @change="togglePaperColumnCfg(col.key)" />
                  <span class="cfg-col-label">{{ col.label }}</span>
                  <button class="soft-btn-icon" @click="movePaperColumnCfg(i, -1)" :disabled="i === 0" title="上移">↑</button>
                  <button class="soft-btn-icon" @click="movePaperColumnCfg(i, 1)" :disabled="i === paperColumnList.length - 1" title="下移">↓</button>
                </div>
                <button class="soft-btn-ghost btn-sm" style="margin-top:6px;" @click="resetPaperColumnsCfg">恢复默认列</button>
              </div>
            </div>

            <!-- 标签颜色管理 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a2 2 0 0 1 2-2h9.586a2 2 0 0 1 1.414.586l3.414 3.414a2 2 0 0 1 0 2.828l-3.414 3.414a2 2 0 0 1-1.414.586H6a2 2 0 0 1-2-2V9z"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/></svg>
                标签颜色管理
              </h4>
              <div class="cfg-list">
                <div v-if="paperLibraryStore.allTags().length === 0" class="cfg-empty">暂无标签，可在添加/编辑文献时创建</div>
                <div v-for="tag in paperLibraryStore.allTags()" :key="tag" class="cfg-item cfg-tag-color-item">
                  <span class="cfg-tag-name">{{ tag }}</span>
                  <input type="color" class="cfg-color" :value="paperLibraryStore.getTagColor(tag) || '#6B7280'" @input="e => paperLibraryStore.setTagColor(tag, e.target.value)" title="选择颜色" />
                  <button class="soft-btn-icon" @click="paperLibraryStore.setTagColor(tag, '')" title="恢复默认">↺</button>
                  <button class="soft-btn-icon danger" @click="confirmDeleteTag(tag)" title="删除标签">✕</button>
                </div>
                <button v-if="paperLibraryStore.allTags().length > 0" class="soft-btn-ghost btn-sm" style="margin-top:6px;" @click="resetAllTagColors">恢复所有标签默认颜色</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 论文阅读：添加/编辑记录弹窗 -->
    <div v-if="showReadingModal" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, closeReadingModal)">
      <div class="modal-content" style="max-width: 680px; max-height: 88vh; overflow-y: auto;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title">{{ editingReading ? '编辑阅读记录' : '添加阅读记录' }}</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-primary" @click="saveReading" :title="editingReading ? '保存' : '添加'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ editingReading ? '保存' : '添加' }}
              </button>
              <button class="soft-btn-close" @click="closeReadingModal" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <!-- 链接论文列表中的论文 -->
            <div class="config-section">
              <label class="form-label"><AppIcon name="link" />  链接论文列表中的论文</label>
              <GlassSelect
                v-model="readingForm.paperId"
                @change="onReadingLinkPaper"
                select-class="input"
                placeholder="不关联论文（手动填写）"
                :options="[
                  { value: '', label: '不关联论文（手动填写）' },
                  ...paperLibraryStore.papers.map(p => ({ value: p.id, label: p.title }))
                ]"
              />
              <div class="form-hint">选择论文列表中的论文后，将自动带出论文题目与年份</div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label">论文题目 <span class="required"> *</span></label>
                <input class="input" v-model="readingForm.title" placeholder="请输入论文题目" />
              </div>
              <div class="form-group" style="width: 140px;">
                <label class="form-label">年份</label>
                <input class="input" v-model="readingForm.year" placeholder="如 2024" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">研究对象</label>
              <textarea class="input" v-model="readingForm.researchObject" placeholder="本论文研究的对象/样本" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">研究目的</label>
              <textarea class="input" v-model="readingForm.researchPurpose" placeholder="本论文要解决的问题/目标" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">研究方法</label>
              <textarea class="input" v-model="readingForm.researchMethod" placeholder="使用了哪些研究方法" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">创新点</label>
              <textarea class="input" v-model="readingForm.innovation" placeholder="本论文的创新之处" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">可借鉴思路</label>
              <textarea class="input" v-model="readingForm.referenceIdeas" placeholder="可以借鉴的思路/启发" rows="2"></textarea>
            </div>

            <!-- 标签 -->
            <div class="form-group">
              <label class="form-label">标签</label>
              <div class="tag-input-container">
                <div class="tag-input-wrap" :class="{ 'has-suggest': showReadingTagSuggest && (availableReadingTags.length || (newReadingTagInput.trim() && !paperReadingsStore.allTags().includes(newReadingTagInput.trim()))) }">
                  <span v-for="(tag, i) in (readingForm.tags || [])" :key="i" class="tag-input-chip" :style="tagStyle(tag)">
                    <span class="tag-color-dot" :style="{ background: paperLibraryStore.getTagColor(tag) || '#6B7280' }"></span>
                    {{ tag }}
                    <button class="tag-remove" @click="removeReadingFormTag(i)">×</button>
                  </span>
                  <input class="tag-input-field" v-model="newReadingTagInput" placeholder="选择或输入标签，回车创建"
                    @focus="showReadingTagSuggest = true"
                    @input="showReadingTagSuggest = true"
                    @keydown.enter.prevent="addReadingFormTag"
                    @keydown.backspace="handleReadingTagBackspace"
                    @keydown.esc="showReadingTagSuggest = false"
                    @blur="onReadingTagInputBlur" />
                </div>
                <div v-if="showReadingTagSuggest && (availableReadingTags.length || (newReadingTagInput.trim() && !paperReadingsStore.allTags().includes(newReadingTagInput.trim())))" class="tag-suggest-panel">
                  <template v-if="availableReadingTags.length">
                    <div class="tag-suggest-title">已有标签（点击选择）</div>
                    <div class="tag-suggest-list">
                      <button v-for="tag in availableReadingTags" :key="tag" type="button" class="tag-suggest-item" :style="tagStyle(tag)" @mousedown.prevent="toggleReadingFormTag(tag)">
                        <span class="tag-color-dot" :style="{ background: paperLibraryStore.getTagColor(tag) || '#6B7280' }"></span>
                        {{ tag }}
                      </button>
                    </div>
                  </template>
                  <button v-if="newReadingTagInput.trim() && !paperReadingsStore.allTags().includes(newReadingTagInput.trim())" type="button" class="tag-suggest-create" @mousedown.prevent="addReadingFormTag">
                    <AppIcon name="plus" /> 创建标签「{{ newReadingTagInput.trim() }}」
                  </button>
                </div>
              </div>
              <div class="form-hint">可点击选择已有标签，或直接输入后回车创建新标签</div>
            </div>

            <!-- 自定义字段 -->
            <template v-for="cf in enabledReadingCustomFields" :key="cf.key">
              <div v-if="cf.type === 'textarea'" class="form-group">
                <label class="form-label">{{ cf.label }}</label>
                <textarea class="input" v-model="readingForm[cf.key]" :placeholder="'请输入' + cf.label" rows="2"></textarea>
              </div>
              <div v-else class="form-group">
                <label class="form-label">{{ cf.label }}</label>
                <input class="input" v-model="readingForm[cf.key]" :placeholder="'请输入' + cf.label" />
              </div>
            </template>

            <!-- 底部仅保留删除 -->
            <div style="display: flex; gap: 8px; justify-content: space-between; margin-top: 4px;">
              <button v-if="editingReading" class="btn btn-danger btn-sm" @click="deleteReading(editingReading)"><AppIcon name="trash" />  删除</button>
              <span v-else></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 论文阅读：设置弹窗 -->
    <div v-if="showReadingConfigModal" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showReadingConfigModal = false })">
      <div class="modal-content config-modal">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title"><AppIcon name="settings" />  论文阅读设置</h3>
            <button class="soft-btn-close" @click="showReadingConfigModal = false" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <p class="text-xs text-tertiary" style="margin-bottom: 16px;">配置论文阅读表格的列显示、列排序与自定义字段。修改即时生效。</p>

          <div class="cfg-grid">
            <!-- 论文阅读表格列设置 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                论文阅读表格列设置
              </h4>
              <div class="cfg-list">
                <div v-for="(col, i) in readingColumnList" :key="col.key" class="cfg-item">
                  <input type="checkbox" :checked="readingColumnVisibleCfg(col.key)" @change="toggleReadingColumnCfg(col.key)" />
                  <span class="cfg-col-label">{{ col.label }}</span>
                  <button class="soft-btn-icon" @click="moveReadingColumnCfg(i, -1)" :disabled="i === 0" title="上移">↑</button>
                  <button class="soft-btn-icon" @click="moveReadingColumnCfg(i, 1)" :disabled="i === readingColumnList.length - 1" title="下移">↓</button>
                </div>
                <button class="soft-btn-ghost btn-sm" style="margin-top:6px;" @click="resetReadingColumnsCfg">恢复默认列</button>
              </div>
            </div>

            <!-- 自定义字段 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
                自定义字段
              </h4>
              <div class="cfg-list">
                <div v-if="paperReadingsStore.customFields.length === 0" class="cfg-empty">暂无自定义字段，可在下方添加</div>
                <label v-for="cf in paperReadingsStore.customFields" :key="cf.key" class="cfg-toggle">
                  <input type="checkbox" :checked="cf.enabled" @change="toggleReadingCustomFieldCfg(cf)" />
                  <span>{{ cf.label }}</span>
                  <button class="soft-btn-icon danger" @click="deleteReadingCustomFieldCfg(cf)" title="删除">✕</button>
                </label>
                <div style="display:flex; gap:6px; margin-top: 4px;">
                  <input class="input" v-model="newReadingCustomFieldName" placeholder="新字段名称" style="flex:1;" />
                  <GlassSelect
                    v-model="newReadingCustomFieldType"
                    style="width:96px;"
                    select-class="input"
                    :options="[
                      { value: 'text', label: '文本' },
                      { value: 'number', label: '数字' },
                      { value: 'textarea', label: '多行' }
                    ]"
                  />
                  <button class="soft-btn btn-sm" @click="addReadingCustomFieldCfg">+ 添加</button>
                </div>
              </div>
            </div>

            <!-- 阅读标签管理 -->
            <div class="cfg-group">
              <h4 class="cfg-group-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a2 2 0 0 1 2-2h9.586a2 2 0 0 1 1.414.586l3.414 3.414a2 2 0 0 1 0 2.828l-3.414 3.414a2 2 0 0 1-1.414.586H6a2 2 0 0 1-2-2V9z"/><circle cx="8" cy="12" r="1.5" fill="currentColor"/></svg>
                阅读标签管理
              </h4>
              <div class="cfg-list">
                <div v-if="mergedTags.length === 0" class="cfg-empty">暂无标签，可在添加文献/阅读记录时创建</div>
                <div v-for="(tag, i) in mergedTags" :key="tag" class="cfg-item cfg-tag-color-item">
                  <span class="cfg-tag-name" :title="tag">{{ tag }}</span>
                  <input type="color" class="cfg-color" :value="paperLibraryStore.getTagColor(tag) || '#6B7280'" @input="e => paperLibraryStore.setTagColor(tag, e.target.value)" title="选择颜色" />
                  <button class="soft-btn-icon" @click="paperLibraryStore.moveTag(tag, -1)" :disabled="i === 0" title="上移">↑</button>
                  <button class="soft-btn-icon" @click="paperLibraryStore.moveTag(tag, 1)" :disabled="i === mergedTags.length - 1" title="下移">↓</button>
                  <button class="soft-btn-icon" @click="paperLibraryStore.setTagColor(tag, '')" title="恢复默认">↺</button>
                  <button class="soft-btn-icon danger" @click="confirmDeleteTag(tag)" title="删除标签">✕</button>
                </div>
                <button v-if="mergedTags.length > 0" class="soft-btn-ghost btn-sm" style="margin-top:6px;" @click="resetAllTagColors">恢复所有标签默认颜色</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 论文阅读：详情弹窗（只读，单击触发；关联论文时展示论文库详情与分区） -->
    <div v-if="showReadingDetailModal" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, closeReadingDetail)">
      <div class="modal-content" style="max-width: 640px; max-height: 88vh; overflow-y: auto;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title"><AppIcon name="book-open" />  阅读记录详情</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-primary" @click="closeReadingDetail(); openEditReading(detailReading)" title="编辑">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                编辑
              </button>
              <button class="soft-btn-close" @click="closeReadingDetail" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>

          <div v-if="detailReading" class="detail-content">
            <div class="detail-field">
              <span class="detail-label">论文题目</span>
              <span class="detail-value detail-title">{{ detailReading.title || '-' }}</span>
            </div>
            <div class="detail-row">
              <div class="detail-field flex-1">
                <span class="detail-label">年份</span>
                <span class="detail-value">{{ detailReading.year || '-' }}</span>
              </div>
              <div class="detail-field flex-1">
                <span class="detail-label">添加时间</span>
                <span class="detail-value">{{ formatReadingTime(detailReading.createdAt) }}</span>
              </div>
            </div>
            <div class="detail-field">
              <span class="detail-label">研究对象</span>
              <span class="detail-value detail-textarea">{{ detailReading.researchObject || '-' }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-label">研究目的</span>
              <span class="detail-value detail-textarea">{{ detailReading.researchPurpose || '-' }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-label">研究方法</span>
              <span class="detail-value detail-textarea">{{ detailReading.researchMethod || '-' }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-label">创新点</span>
              <span class="detail-value detail-textarea">{{ detailReading.innovation || '-' }}</span>
            </div>
            <div class="detail-field">
              <span class="detail-label">可借鉴思路</span>
              <span class="detail-value detail-textarea">{{ detailReading.referenceIdeas || '-' }}</span>
            </div>
            <div v-if="(detailReading.tags || []).length > 0" class="detail-field">
              <span class="detail-label">标签</span>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                <span v-for="tag in detailReading.tags" :key="tag" class="mini-tag" :style="tagStyle(tag)">{{ tag }}</span>
              </div>
            </div>

            <!-- 关联论文信息（论文列表） -->
            <div v-if="detailLinkedPaper" class="reading-linked-paper">
              <div class="reading-linked-head">
                <span class="reading-linked-title"><AppIcon name="link" />  关联论文信息</span>
                <button class="soft-btn soft-btn-primary" @click="openDetailPaper(detailLinkedPaper)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  在论文列表中查看
                </button>
              </div>
              <div class="detail-field">
                <span class="detail-label">论文题目</span>
                <span class="detail-value detail-title">{{ detailLinkedPaper.title || '-' }}</span>
              </div>
              <div class="detail-row">
                <div class="detail-field flex-1">
                  <span class="detail-label">作者</span>
                  <span class="detail-value">{{ detailLinkedPaper.authors || '-' }}</span>
                </div>
                <div class="detail-field flex-1">
                  <span class="detail-label">年份</span>
                  <span class="detail-value">{{ detailLinkedPaper.year || '-' }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-field flex-1">
                  <span class="detail-label">期刊</span>
                  <span class="detail-value">{{ detailLinkedPaper.journal || '-' }}</span>
                </div>
                <div class="detail-field flex-1">
                  <span class="detail-label">状态</span>
                  <span class="status-badge" :style="statusBadgeStyle(detailLinkedPaper.status)" style="cursor:default;">{{ getStatusName(detailLinkedPaper.status) }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-field flex-1">
                  <span class="detail-label">单位</span>
                  <span class="detail-value">{{ detailLinkedPaper.unit || '-' }}</span>
                </div>
                <div class="detail-field flex-1">
                  <span class="detail-label">影响 / 分区</span>
                  <span class="detail-value">
                    <span v-if="parseImpact(detailLinkedPaper.impact).length" style="display:flex;flex-wrap:wrap;gap:3px;">
                      <span v-for="(b, bi) in parseImpact(detailLinkedPaper.impact)" :key="bi" class="impact-badge" :style="b.style">{{ b.text }}</span>
                    </span>
                    <template v-else>-</template>
                  </span>
                </div>
              </div>
              <div v-if="detailLinkedPaper.doi" class="detail-field">
                <span class="detail-label">DOI</span>
                <span class="detail-value" style="font-family:monospace;">{{ detailLinkedPaper.doi }}</span>
              </div>
              <div v-if="(detailLinkedPaper.tags || []).length > 0" class="detail-field">
                <span class="detail-label">标签</span>
                <div style="display:flex;flex-wrap:wrap;gap:4px;">
                  <span v-for="tag in detailLinkedPaper.tags" :key="tag" class="mini-tag" :style="tagStyle(tag)">{{ tag }}</span>
                </div>
              </div>
              <div v-if="detailLinkedPaper.pdfFileName" class="detail-field">
                <span class="detail-label">PDF 文件</span>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <button class="btn btn-sm btn-primary" @click="openPaperPdfExternal(detailLinkedPaper)"><AppIcon name="file-text" />  打开 PDF</button>
                  <button class="btn btn-sm btn-outline" @click="openPaperPdfAnnotate(detailLinkedPaper)"><AppIcon name="pencil" />  平台批注</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文献详情弹窗（只读，单击触发） -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, closeDetailModal)">
      <div class="modal-content" style="max-width: 640px; max-height: 88vh; overflow-y: auto;">
        <div style="padding: 24px;">
          <div class="modal-head">
            <h3 class="modal-head-title"><AppIcon name="file-text" />  文献详情</h3>
            <div class="modal-head-actions">
              <button class="soft-btn soft-btn-primary" @click="closeDetailModal(); openEditPaper(detailPaper)" title="编辑">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                编辑
              </button>
              <button class="soft-btn-close" @click="closeDetailModal" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
          </div>

          <div v-if="detailPaper" class="detail-content">
            <div class="detail-field">
              <span class="detail-label">论文题目</span>
              <span class="detail-value detail-title">{{ detailPaper.title || '-' }}</span>
            </div>
            <div class="detail-row">
              <div class="detail-field flex-1">
                <span class="detail-label">作者</span>
                <span class="detail-value">{{ detailPaper.authors || '-' }}</span>
              </div>
              <div class="detail-field flex-1">
                <span class="detail-label">年份</span>
                <span class="detail-value">{{ detailPaper.year || '-' }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-field flex-1">
                <span class="detail-label">期刊</span>
                <span class="detail-value">{{ detailPaper.journal || '-' }}</span>
              </div>
              <div class="detail-field flex-1">
                <span class="detail-label">状态</span>
                <span class="status-badge" :style="statusBadgeStyle(detailPaper.status)" style="cursor:default;">{{ getStatusName(detailPaper.status) }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-field flex-1">
                <span class="detail-label">单位</span>
                <span class="detail-value">{{ detailPaper.unit || '-' }}</span>
              </div>
              <div class="detail-field flex-1">
                <span class="detail-label">影响</span>
                <span class="detail-value">
                  <span v-if="parseImpact(detailPaper.impact).length" style="display:flex;flex-wrap:wrap;gap:3px;">
                    <span v-for="(b, bi) in parseImpact(detailPaper.impact)" :key="bi" class="impact-badge" :style="b.style">{{ b.text }}</span>
                  </span>
                  <template v-else>-</template>
                </span>
              </div>
            </div>
            <div v-if="detailPaper.doi" class="detail-field">
              <span class="detail-label">DOI</span>
              <span class="detail-value" style="font-family:monospace;">{{ detailPaper.doi }}</span>
            </div>
            <div v-if="(detailPaper.tags || []).length > 0" class="detail-field">
              <span class="detail-label">标签</span>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                <span v-for="tag in detailPaper.tags" :key="tag" class="mini-tag" :style="tagStyle(tag)">{{ tag }}</span>
              </div>
            </div>
            <div v-if="detailPaper.mainContent" class="detail-field">
              <span class="detail-label">主要内容</span>
              <p class="detail-value detail-textarea">{{ detailPaper.mainContent }}</p>
            </div>
            <div v-if="detailPaper.innovation" class="detail-field">
              <span class="detail-label">可借鉴创新点</span>
              <p class="detail-value detail-textarea">{{ detailPaper.innovation }}</p>
            </div>
            <div v-if="detailPaper.pdfFileName" class="detail-field">
              <span class="detail-label">PDF 文件</span>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-sm btn-primary" @click="openPaperPdfExternal(detailPaper)"><AppIcon name="file-text" />  打开 PDF</button>
                <button class="btn btn-sm btn-outline" @click="openPaperPdfAnnotate(detailPaper)"><AppIcon name="pencil" />  平台批注</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 笔记详情弹窗（只读，单击触发） -->
  <div v-if="showNoteDetailModal" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, closeNoteDetail)">
    <div class="modal-content" style="max-width: 600px; max-height: 88vh; overflow-y: auto;">
      <div style="padding: 24px;">
        <div class="modal-head" style="align-items: flex-start;">
          <h3 class="modal-head-title"><AppIcon name="file-edit" />  {{ detailNote?.title }}</h3>
          <div class="modal-head-actions" style="margin-top: 2px;">
            <button class="soft-btn soft-btn-primary" @click="showNoteDetailModal = false; activeTab = 'notes'; nextTick(() => openNoteEdit(detailNote))" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              编辑
            </button>
            <button class="soft-btn-close" @click="closeNoteDetail" title="关闭"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        </div>
        <div v-if="detailNote" style="margin-bottom:12px;display:flex;gap:12px;font-size:13px;color:var(--text-secondary);">
          <span v-if="detailNote.paperId">关联: {{ getPaperTitle(detailNote.paperId) }}</span>
          <span>{{ formatNoteTime(detailNote.updatedAt) }}</span>
        </div>
        <div v-if="detailNote" class="note-html-preview" v-html="renderNoteHtml(detailNote.content)" style="padding:16px;background:var(--bg-secondary);border-radius:8px;line-height:1.7;"></div>
      </div>
    </div>
  </div>

  <!-- PDF 阅读器 -->
  <PdfReader
    :visible="pdfReaderVisible"
    :pdfUrl="currentPdfUrl"
    :fileName="currentPdfName"
    :paperId="currentPdfPaperId"
    @close="pdfReaderVisible = false"
  />
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { usePaperLibraryStore, useSettingsStore, usePaperNotesStore, usePaperReadingsStore } from '../stores'
import { todayStr, load, save, uid } from '../utils/storage'
import { initPdfDir, getPdfDirInfo, savePdfToDir, openPdfFromDir, pdfExists, deletePdfFromStorage, isTauriRuntime, ensurePdfOnDisk } from '../utils/paperPdfStorage'
import { checkBridgeOnline, openPdfViaBridge } from '../utils/localBridge'
import { openPath, printHtml, downloadBlob, openWithApp } from '../utils/desktopBridge'
import PdfReader from '../components/pdf/PdfReader.vue'
import GlassSelect from '../components/common/GlassSelect.vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const paperLibraryStore = usePaperLibraryStore()
const settingsStore = useSettingsStore()
const paperNotesStore = usePaperNotesStore()
const paperReadingsStore = usePaperReadingsStore()

// ===== 论文库配置弹窗（v5.0.123 从「平台设置」迁移至此） =====
const showPaperConfigModal = ref(false)

// 论文库状态
const paperStatusList = computed(() => paperLibraryStore.sortedStatuses)
function addPaperStatusCfg() {
  const name = prompt('请输入新状态名称：')
  if (name && name.trim()) paperLibraryStore.addStatus({ name: name.trim(), color: '#6B7280' })
}
function deletePaperStatusCfg(s) {
  if (paperLibraryStore.statuses.length <= 1) { alert('至少保留一个状态'); return }
  if (confirm(`确定删除状态「${s.name}」吗？该状态下的文献将自动归入第一个状态。`)) {
    paperLibraryStore.deleteStatus(s.id)
  }
}

// 添加文献表单字段
const newCustomFieldName = ref('')
const newCustomFieldType = ref('text')
function togglePaperFormFieldCfg(f) {
  if (f.fixed) return
  paperLibraryStore.setFormFields(paperLibraryStore.formFields.map(x => x.key === f.key ? { ...x, enabled: !x.enabled } : x))
}
function toggleCustomFormFieldCfg(cf) {
  paperLibraryStore.updateCustomField(cf.key, { enabled: !cf.enabled })
}
function addCustomFormFieldCfg() {
  const name = newCustomFieldName.value.trim()
  if (!name) return
  paperLibraryStore.addCustomField({ label: name, type: newCustomFieldType.value })
  newCustomFieldName.value = ''
  newCustomFieldType.value = 'text'
}
function deleteCustomFieldCfg(cf) {
  if (confirm(`确定删除自定义字段「${cf.label}」吗？`)) paperLibraryStore.deleteCustomField(cf.key)
}
function resetPaperFormFieldsCfg() {
  if (confirm('确定恢复添加文献表单字段为默认设置吗？自定义字段也将被清除。')) {
    const defaults = [
      { key: 'title', label: '论文题目', type: 'text', required: true, fixed: true, enabled: true },
      { key: 'authors', label: '作者', type: 'text', required: false, enabled: true },
      { key: 'year', label: '年份', type: 'text', groupWith: 'journal', required: false, enabled: true },
      { key: 'journal', label: '期刊名称', type: 'journal-if', groupWith: 'year', required: false, enabled: true },
      { key: 'unit', label: '单位', type: 'text', groupWith: 'impact', required: false, enabled: true },
      { key: 'impact', label: '影响', type: 'text', groupWith: 'unit', required: false, enabled: true },
      { key: 'doi', label: 'DOI', type: 'doi', required: false, enabled: true },
      { key: 'tags', label: '研究主题标签', type: 'tags', required: false, enabled: true },
      { key: 'mainContent', label: '主要内容', type: 'textarea', required: false, enabled: true },
      { key: 'innovation', label: '可借鉴创新点', type: 'textarea', required: false, enabled: true },
      { key: 'status', label: '状态', type: 'status', required: false, enabled: true },
    ]
    paperLibraryStore.setFormFields(defaults)
    paperLibraryStore.updateCustomFieldsOrder([])
  }
}

// 论文库表格列显示
const PAPER_BASE_COLUMNS = [
  { key: 'status', label: '状态' }, { key: 'title', label: '论文题目' }, { key: 'authors', label: '作者' },
  { key: 'year', label: '年份' }, { key: 'journal', label: '期刊' }, { key: 'unit', label: '单位' },
  { key: 'impact', label: '影响' }, { key: 'mainContent', label: '主要内容' }, { key: 'innovation', label: '创新点' },
  { key: 'tags', label: '标签' },
]
const paperColumnList = computed(() => {
  const custom = (paperLibraryStore.customFields || []).map(f => ({ key: f.key, label: f.label }))
  const allCols = [...PAPER_BASE_COLUMNS, ...custom]
  const colMap = {}
  allCols.forEach(c => { colMap[c.key] = c })
  const result = []
  for (const key of paperLibraryStore.visibleColumns) {
    if (colMap[key]) result.push(colMap[key])
  }
  for (const c of allCols) {
    if (!result.find(r => r.key === c.key)) result.push(c)
  }
  return result
})
function paperColumnVisibleCfg(key) {
  return paperLibraryStore.visibleColumns.includes(key)
}
function togglePaperColumnCfg(key) {
  const cols = [...paperLibraryStore.visibleColumns]
  const idx = cols.indexOf(key)
  if (idx >= 0) cols.splice(idx, 1)
  else cols.push(key)
  paperLibraryStore.setVisibleColumns(cols)
}
function movePaperColumnCfg(i, dir) {
  const options = paperColumnList.value
  const fromKey = options[i].key
  const cols = [...paperLibraryStore.visibleColumns]
  const fromPos = cols.indexOf(fromKey)
  const targetIdx = i + dir
  if (fromPos >= 0) {
    if (targetIdx < cols.length) {
      cols.splice(fromPos, 1)
      cols.splice(targetIdx, 0, fromKey)
    }
  } else if (targetIdx >= 0 && targetIdx < cols.length) {
    cols.splice(targetIdx, 0, fromKey)
  }
  paperLibraryStore.setVisibleColumns(cols)
}
function resetPaperColumnsCfg() {
  const customKeys = (paperLibraryStore.customFields || []).map(f => f.key)
  paperLibraryStore.setVisibleColumns([...PAPER_BASE_COLUMNS.map(c => c.key), ...customKeys])
}

function resetAllTagColors() {
  if (confirm('确定恢复所有标签为默认颜色吗？')) {
    paperLibraryStore.tagColors = {}
    save('paperLibraryTagColors', {})
  }
}

function confirmDeleteTag(tag) {
  if (confirm(`确定删除标签「${tag}」吗？\n所有使用该标签的文献与阅读记录将移除此标签，颜色配置也会清除。`)) {
    paperLibraryStore.deleteTag(tag)
    paperReadingsStore.deleteTag(tag)
  }
}

// 合并文献+阅读记录的全部标签，按自定义顺序排列（未排序的按字母序排在后面）
const mergedTags = computed(() => {
  const set = new Set([...paperLibraryStore.allTags(), ...paperReadingsStore.allTags()])
  const order = paperLibraryStore.tagOrder || []
  const ordered = order.filter(t => set.has(t))
  const rest = [...set].filter(t => !order.includes(t)).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  return [...ordered, ...rest]
})

const activeTab = ref(settingsStore.activeSubTabs['/papers'] || 'overview')
watch(activeTab, (v) => settingsStore.setActiveSubTab('/papers', v))
watch(() => settingsStore.activeSubTabs['/papers'], (v) => { if (v && v !== activeTab.value) activeTab.value = v })
const pdfReaderVisible = ref(false)
const currentPdfUrl = ref('')
const currentPdfName = ref('')
const currentPdfPaperId = ref('')
const linkPdfParse = ref(true)
const pdfLinkInput = ref(null)
function triggerLinkPdf() { if (pdfLinkInput.value) pdfLinkInput.value.click() }
const tabs = [
  { id: 'overview', name: '总览' },
  { id: 'reading', name: '论文阅读' },
  { id: 'library', name: '论文列表' },
  { id: 'notes', name: '论文笔记' },
]

// ===== 动态表单字段 =====
const enabledFormFields = computed(() => {
  return paperLibraryStore.formFieldsWithCustom.filter(f => f.enabled)
})

// ===== 弹窗状态 =====
const showPaperModal = ref(false)
const editingPaper = ref(null)
const doiLoading = ref(false)
const newTagInput = ref('')

// 标签选择面板：聚焦/输入时展示已有标签供点选，回车仍可创建新标签
const showTagSuggest = ref(false)
const availableTags = computed(() => {
  const q = (newTagInput.value || '').trim().toLowerCase()
  const selected = paperForm.value.tags || []
  return paperLibraryStore.allTags().filter(t => !selected.includes(t) && (!q || t.toLowerCase().includes(q)))
})
function toggleFormTag(tag) {
  if (!paperForm.value.tags.includes(tag)) {
    paperForm.value.tags.push(tag)
    if (!paperLibraryStore.getTagColor(tag)) paperLibraryStore.setTagColor(tag, defaultTagColor())
  }
  showTagSuggest.value = true
}
function onTagInputBlur() {
  setTimeout(() => { showTagSuggest.value = false }, 120)
}

// easyScholar
const easyscholarKey = ref(load('easyscholarKey', ''))
const journalLoading = ref(false)
const journalResult = ref(null)
const journalError = ref('')
let lastAutoQueriedJournal = ''
let journalDebounceTimer = null

// PDF 关联
const pdfLoading = ref(false)
const pdfHint = ref('')
const pdfHintOk = ref(false)

// 状态弹窗
const statusPopupId = ref(null)

const emptyForm = () => ({
  title: '',
  year: '',
  unit: '',
  journal: '',
  impact: '',
  mainContent: '',
  innovation: '',
  status: paperLibraryStore.statuses[0]?.id || 'pending',
  authors: '',
  doi: '',
  tags: [],
  readingLevel: 'skim',
  coreConclusion: '',
  personalInsight: '',
  followUpAction: '',
  pdfFileName: '',
})

const paperForm = ref(emptyForm())

// ===== 表单草稿恢复 =====
const paperFormDraft = ref(null)

// ===== 单击打开详情弹窗 =====
const showDetailModal = ref(false)
const showNoteDetailModal = ref(false)
const detailNote = ref(null)
const detailPaper = ref(null)
let ignoreRowClickUntil = 0

function onPaperRowClick(paper) {
  // 拖拽结束后会触发一次 click，忽略掉
  if (Date.now() < ignoreRowClickUntil) return
  openDetailPaper(paper)
}

// ===== 列可见性与排序 =====
const allColumnDefs = [
  { key: 'status', label: '状态' },
  { key: 'title', label: '论文题目' },
  { key: 'authors', label: '作者' },
  { key: 'year', label: '年份' },
  { key: 'journal', label: '期刊' },
  { key: 'unit', label: '单位' },
  { key: 'impact', label: '影响' },
  { key: 'mainContent', label: '主要内容' },
  { key: 'innovation', label: '创新点' },
  { key: 'tags', label: '标签' },
]

// 表格列按 visibleColumns 顺序排列
const orderedColumns = computed(() => {
  const colMap = {}
  allColumnDefs.forEach(c => { colMap[c.key] = c })
  paperLibraryStore.customFields.forEach(f => { colMap[f.key] = { key: f.key, label: f.label, custom: true } })

  const result = []
  for (const key of paperLibraryStore.visibleColumns) {
    if (colMap[key]) result.push(colMap[key])
  }
  return result
})

function getCellTitle(paper, colKey) {
  if (colKey === 'title') return paper.title || ''
  if (colKey === 'tags') return (paper.tags || []).join(', ')
  if (colKey === 'mainContent') return paper.mainContent || ''
  if (colKey === 'innovation') return paper.innovation || ''
  return (paper[colKey] || '')
}

// ===== 筛选 =====
const searchQuery = ref('')
const searchField = ref('all')
const filterJournal = ref('')
const filterYear = ref('')
const filterStatus = ref('')
const filterTags = ref([])
const refreshKey = ref(0)
const showExportMenu = ref(false)

const journalOptions = computed(() => {
  const journals = new Set()
  paperLibraryStore.papers.forEach(p => { if (p.journal) journals.add(p.journal) })
  return [...journals].sort()
})
const yearOptions = computed(() => {
  const years = new Set()
  paperLibraryStore.papers.forEach(p => { if (p.year) years.add(String(p.year)) })
  return [...years].sort((a, b) => b - a)
})
const tagOptions = computed(() => {
  const tags = new Set()
  paperLibraryStore.papers.forEach(p => {
    if (p.tags && Array.isArray(p.tags)) p.tags.forEach(t => tags.add(t))
  })
  return [...tags].sort()
})

const hasActiveFilters = computed(() => {
  return searchQuery.value || filterJournal.value || filterYear.value || filterStatus.value || filterTags.value.length > 0
})

const filteredPapers = computed(() => {
  void refreshKey.value // 依赖 refreshKey，点击搜索刷新按钮时强制重算
  let papers = paperLibraryStore.sortedPapers
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    papers = papers.filter(p => {
      const matchField = (val) => (val || '').toLowerCase().includes(q)
      switch (searchField.value) {
        case 'title': return matchField(p.title)
        case 'authors': return matchField(p.authors)
        case 'journal': return matchField(p.journal)
        case 'unit': return matchField(p.unit)
        case 'tags': return (p.tags || []).some(t => t.toLowerCase().includes(q))
        case 'doi': return matchField(p.doi)
        default: return (
          matchField(p.title) || matchField(p.authors) || matchField(p.journal) ||
          matchField(p.unit) || matchField(p.doi) ||
          (p.tags || []).some(t => t.toLowerCase().includes(q))
        )
      }
    })
  }
  if (filterJournal.value) papers = papers.filter(p => p.journal === filterJournal.value)
  if (filterYear.value) papers = papers.filter(p => String(p.year) === filterYear.value)
  if (filterStatus.value) papers = papers.filter(p => p.status === filterStatus.value)
  if (filterTags.value.length > 0) {
    papers = papers.filter(p => {
      if (!p.tags || p.tags.length === 0) return false
      return filterTags.value.some(t => p.tags.includes(t))
    })
  }
  return papers
})

function toggleFilterTag(tag) {
  const idx = filterTags.value.indexOf(tag)
  if (idx >= 0) filterTags.value.splice(idx, 1)
  else filterTags.value.push(tag)
}

function clearFilters() {
  searchQuery.value = ''
  filterJournal.value = ''
  filterYear.value = ''
  filterStatus.value = ''
  filterTags.value = []
  searchField.value = 'all'
}

function refreshSearch() {
  refreshKey.value++
}

function onSortChange() {
  paperLibraryStore.setSortOrder(paperLibraryStore.sortOrder, paperLibraryStore.sortField)
}

function toggleSortDir() {
  paperLibraryStore.setSortDirection(paperLibraryStore.sortDirection === 'desc' ? 'asc' : 'desc')
}

function toggleExportMenu() {
  showExportMenu.value = !showExportMenu.value
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

function handleClickOutside(e) {
  if (showExportMenu.value && !e.target.closest('.export-dropdown')) {
    showExportMenu.value = false
  }
  if (showReadingExportMenu.value && !e.target.closest('.export-dropdown')) {
    showReadingExportMenu.value = false
  }
  if (statusPopupId.value && !e.target.closest('.status-badge') && !e.target.closest('.status-popup')) {
    statusPopupId.value = null
  }
  if (activeColorPicker.value && !e.target.closest('.wt-color-wrap')) {
    activeColorPicker.value = null
  }
}

// 表格滚动时关闭状态弹窗
function handleTableScrollClose() {
  if (statusPopupId.value) {
    statusPopupId.value = null
  }
}

// ===== 状态徽章 =====
const statusPopupStyle = ref({})
function toggleStatusPopup(paper, event) {
  if (statusPopupId.value === paper.id) {
    statusPopupId.value = null
    return
  }
  // 使用 fixed 定位 + Teleport 到 body，避免被 overflow-x:auto 裁剪
  const badge = event?.target?.closest?.('.status-badge') || event?.target
  if (badge) {
    const rect = badge.getBoundingClientRect()
    // 估算弹窗高度：每项约 30px + 8px 边框/padding
    const popupHeight = paperLibraryStore.sortedStatuses.length * 30 + 8
    const gap = 6
    // 预留 48px 给 Windows 任务栏
    const taskbarReserve = 48
    const spaceBelow = window.innerHeight - rect.bottom - taskbarReserve
    // 下方空间足够就放下方，否则放上方
    const top = spaceBelow >= popupHeight + gap
      ? (rect.bottom + gap) + 'px'
      : Math.max(8, rect.top - popupHeight - gap) + 'px'

    statusPopupStyle.value = {
      position: 'fixed',
      top: top,
      left: Math.max(65, Math.min(rect.left + rect.width / 2, window.innerWidth - 65)) + 'px',
      transform: 'translateX(-50%)',
      zIndex: 99999,
    }
  }
  statusPopupId.value = paper.id
}

function statusBadgeStyle(statusId) {
  const s = paperLibraryStore.statuses.find(x => x.id === statusId)
  const color = s?.color || '#6B7280'
  return { background: color + '20', color: color, borderColor: color + '50' }
}

// ===== 标签输入 =====
function addFormTag() {
  const tag = newTagInput.value.trim()
  if (tag && !paperForm.value.tags.includes(tag)) {
    paperForm.value.tags.push(tag)
    // 首次添加标签时自动分配一个默认颜色
    if (!paperLibraryStore.getTagColor(tag)) {
      paperLibraryStore.setTagColor(tag, defaultTagColor())
    }
  }
  newTagInput.value = ''
}

// 标签默认颜色池
const TAG_COLOR_POOL = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#14B8A6', '#3B82F6', '#6B7280', '#84CC16',
]
function defaultTagColor() {
  const count = Object.keys(paperLibraryStore.tagColors || {}).length
  return TAG_COLOR_POOL[count % TAG_COLOR_POOL.length]
}
function tagStyle(tag) {
  const color = paperLibraryStore.getTagColor(tag) || '#6B7280'
  return { background: color + '1A', color: color, borderColor: color + '40' }
}

// 解析影响因子字符串，提取 IF / JCR / 中科院分区
function parseImpact(impactStr) {
  if (!impactStr) return []
  const badges = []
  // IF=3.5 或 IF:3.5
  const ifMatch = impactStr.match(/IF[=:]?\s*([\d.]+)/i)
  if (ifMatch) {
    badges.push({ text: `IF ${ifMatch[1]}`, style: { background: '#3B82F615', color: '#3B82F6' } })
  }
  // JCR Q1/Q2/Q3/Q4
  const jcrMatch = impactStr.match(/JCR\s*(Q[1-4])/i)
  if (jcrMatch) {
    badges.push({ text: jcrMatch[1].toUpperCase(), style: { background: '#10B98115', color: '#10B981' } })
  }
  // 中科院xxx区 — 去掉大类名称（如"工程技术"），只保留"中科院N区"
  const casMatch = impactStr.match(/中科院([^\s|]+区)/)
  if (casMatch) {
    let zone = casMatch[1] // e.g. "工程技术1区" or "1区"
    zone = zone.replace(/^(工程技术|综合性|化学|物理|生物|医学|农林|环境|地学|数学|管理|社科|人文|经济|信息|材料|工程|地球|生命|医学|药学|计算机|电子|机械|土木|能源|自动化|力学|水利|测绘|地质|矿业|轻工|纺织|食品|建筑|交通|航空|兵器|核科学|安全|其他|[a-zA-Z]+)?/, '')
    // 如果 zone 不以数字开头，说明没去掉大类名，用另一个正则直接提取数字+区
    if (!/^\d+区/.test(zone)) {
      const numMatch = casMatch[1].match(/(\d+区)/)
      zone = numMatch ? numMatch[1] : casMatch[1]
    }
    badges.push({ text: `中科院${zone}`, style: { background: '#8B5CF615', color: '#8B5CF6' } })
  }
  // CSSCI（中文社科核心）
  if (/CSSCI/i.test(impactStr)) {
    const m = impactStr.match(/CSSCI\s*:?\s*([^\s|]*)/i)
    badges.push({ text: (m && m[1]) ? m[1] : 'CSSCI', style: { background: '#06B6D415', color: '#06B6D4' } })
  }
  // 北大核心
  if (/北大核心/.test(impactStr)) {
    badges.push({ text: '北大核心', style: { background: '#F59E0B15', color: '#F59E0B' } })
  }
  // CSCD（中国科学引文数据库）
  if (/CSCD/i.test(impactStr)) {
    const m = impactStr.match(/CSCD\s*:?\s*([^\s|]*)/i)
    const val = (m && m[1]) ? m[1] : ''
    badges.push({ text: val ? `CSCD ${val}` : 'CSCD', style: { background: '#EC489915', color: '#EC4899' } })
  }
  return badges
}

function removeFormTag(i) { paperForm.value.tags.splice(i, 1) }
function handleTagBackspace() {
  if (!newTagInput.value && paperForm.value.tags.length > 0) paperForm.value.tags.pop()
}

// ===== easyScholar =====
function onJournalBlur() {
  if (journalDebounceTimer) clearTimeout(journalDebounceTimer)
  const journal = paperForm.value.journal.trim()
  if (!journal) return
  journalDebounceTimer = setTimeout(() => {
    if (journal === lastAutoQueriedJournal && journalResult.value) return
    if (journal !== paperForm.value.journal.trim()) return
    autoQueryJournalImpact()
  }, 500)
}

async function autoQueryJournalImpact() {
  const journal = paperForm.value.journal.trim()
  if (!journal || journal.length < 2) return
  easyscholarKey.value = load('easyscholarKey', '')
  if (!easyscholarKey.value) return
  if (journalLoading.value) return
  journalLoading.value = true
  journalError.value = ''
  journalResult.value = null
  try {
    const url = `https://www.easyscholar.cc/open/getPublicationRank?secretKey=${encodeURIComponent(easyscholarKey.value)}&publicationName=${encodeURIComponent(journal)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.code !== 200 || !data.data) { journalError.value = data.msg || '未找到该期刊'; lastAutoQueriedJournal = ''; return }
    const all = data.data.officialRank?.all || {}
    const select = data.data.officialRank?.select || {}
    journalResult.value = {
      sciif: select.sciif || all.sciif || '', sciif5: select.sciif5 || all.sciif5 || '',
      sci: select.sci || all.sci || '', sciBase: select.sciBase || all.sciBase || '',
      sciUp: select.sciUp || all.sciUp || '', sciUpTop: select.sciUpTop || all.sciUpTop || '',
      jci: select.jci || all.jci || '', cssci: select.cssci || all.cssci || '',
      pku: select.pku || all.pku || '', cscd: select.cscd || all.cscd || '',
      abdc: select.abdc || all.abdc || '', ajg: select.ajg || all.ajg || '',
      ccf: select.ccf || all.ccf || '', eii: select.eii || all.eii || '',
    }
    applyImpactToForm()
    lastAutoQueriedJournal = journal
    journalError.value = ''
  } catch (e) { console.error('easyScholar auto-query failed:', e); journalError.value = ''; lastAutoQueriedJournal = '' }
  finally { journalLoading.value = false }
}

async function fetchJournalImpact() {
  const journal = paperForm.value.journal.trim()
  if (!journal) { journalError.value = '请先输入期刊名称'; journalResult.value = null; return }
  easyscholarKey.value = load('easyscholarKey', '')
  if (!easyscholarKey.value) { journalError.value = '请先在「平台设置 → easyScholar API 配置」中设置 Secret Key'; journalResult.value = null; return }
  journalLoading.value = true; journalError.value = ''; journalResult.value = null
  try {
    const url = `https://www.easyscholar.cc/open/getPublicationRank?secretKey=${encodeURIComponent(easyscholarKey.value)}&publicationName=${encodeURIComponent(journal)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.code !== 200 || !data.data) { journalError.value = data.msg || '未找到该期刊'; return }
    const all = data.data.officialRank?.all || {}
    const select = data.data.officialRank?.select || {}
    journalResult.value = {
      sciif: select.sciif || all.sciif || '', sciif5: select.sciif5 || all.sciif5 || '',
      sci: select.sci || all.sci || '', sciBase: select.sciBase || all.sciBase || '',
      sciUp: select.sciUp || all.sciUp || '', sciUpTop: select.sciUpTop || all.sciUpTop || '',
      jci: select.jci || all.jci || '', cssci: select.cssci || all.cssci || '',
      pku: select.pku || all.pku || '', cscd: select.cscd || all.cscd || '',
      abdc: select.abdc || all.abdc || '', ajg: select.ajg || all.ajg || '',
      ccf: select.ccf || all.ccf || '', eii: select.eii || all.eii || '',
    }
    applyImpactToForm()
    lastAutoQueriedJournal = journal
  } catch (e) { console.error('easyScholar query failed:', e); journalError.value = '查询失败：' + (e.message || '网络错误') }
  finally { journalLoading.value = false }
}

function applyImpactToForm() {
  if (!journalResult.value) return
  const r = journalResult.value
  const parts = []
  if (r.sciif) parts.push(`IF=${r.sciif}`)
  if (r.sciif5 && r.sciif5 !== r.sciif) parts.push(`5年IF=${r.sciif5}`)
  if (r.sci) parts.push(`JCR ${r.sci}`)
  if (r.sciUp) parts.push(`中科院${r.sciUp}区`)
  if (r.sciUpTop === '是') parts.push('TOP期刊')
  if (r.cssci) parts.push(`CSSCI: ${r.cssci}`)
  if (r.pku) parts.push(`北大核心: ${r.pku}`)
  if (r.cscd) parts.push(`CSCD: ${r.cscd}`)
  if (r.jci) parts.push(`JCI: ${r.jci}`)
  paperForm.value.impact = parts.join(' | ')
}

// ===== DOI 自动抓取 =====
async function fetchDoi() {
  const doi = paperForm.value.doi.trim()
  if (!doi) return
  doiLoading.value = true
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const msg = data.message
    if (!msg) throw new Error('No data')

    // 题目
    if (msg.title?.[0] && !paperForm.value.title) {
      paperForm.value.title = msg.title[0]
    }
    // 作者（完整提取，自动格式化）
    if (msg.author?.length > 0) {
      const authors = msg.author.map(a => {
        const name = [a.given, a.family].filter(Boolean).join(' ')
        return name
      }).filter(Boolean)
      if (authors.length > 0 && !paperForm.value.authors) {
        paperForm.value.authors = authors.join('; ')
      }
    }
    // 年份
    const dateParts = msg['published-print']?.['date-parts']?.[0]
      || msg['issued']?.['date-parts']?.[0]
      || msg['created']?.['date-parts']?.[0]
    if (dateParts?.[0] && !paperForm.value.year) {
      paperForm.value.year = String(dateParts[0])
    }
    // 期刊名称
    if (msg['container-title']?.[0] && !paperForm.value.journal) {
      paperForm.value.journal = msg['container-title'][0]
      // 自动触发 easyScholar 查询
      if (easyscholarKey.value) {
        nextTick(() => autoQueryJournalImpact())
      }
    }
    // 单位（优先从第一作者 affiliation 取，其次用 publisher）
    if (!paperForm.value.unit) {
      const firstAuthor = msg.author?.[0]
      if (firstAuthor?.affiliation?.length > 0) {
        paperForm.value.unit = firstAuthor.affiliation[0].name
      } else if (msg.publisher) {
        paperForm.value.unit = msg.publisher
      }
    }
    // 摘要 → 总结提炼填入主要内容
    if (msg.abstract && !paperForm.value.mainContent) {
      const abstractText = stripHtml(msg.abstract)
      const summary = summarizeAbstract(abstractText)
      paperForm.value.mainContent = summary
    }

    // 统计识别结果
    const filled = []
    if (msg.title?.[0]) filled.push('题目')
    if (msg.author?.length > 0) filled.push('作者')
    if (dateParts?.[0]) filled.push('年份')
    if (msg['container-title']?.[0]) filled.push('期刊')
    if (paperForm.value.unit) filled.push('单位')
    if (msg.abstract) filled.push('摘要(已提炼)')
    if (filled.length > 0) {
      console.log('DOI 自动识别完成：' + filled.join('、'))
    }
  } catch (e) {
    console.error('DOI fetch failed:', e)
    alert('DOI 获取失败，请检查 DOI 是否正确（可能需要网络代理访问 crossref.org）')
  }
  finally { doiLoading.value = false }
}

// 去除 HTML 标签
function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

// 摘要智能提炼
function summarizeAbstract(text) {
  if (!text) return ''
  // 清理文本
  let cleaned = text.replace(/\s+/g, ' ').trim()
  // 按句号/分号分句
  const sentences = cleaned.split(/[.。;；!！?？]\s*/).filter(s => s.trim().length > 15)
  if (sentences.length === 0) {
    // 不够分句条件，直接截取前500字
    return cleaned.length > 500 ? cleaned.slice(0, 500) + '...' : cleaned
  }
  // 策略：
  // 1. 取前2句（通常是背景/目的）
  // 2. 取中间位置2句（通常是方法/结果）
  // 3. 取最后1-2句（通常是结论）
  const total = sentences.length
  let selected = []
  // 开头1-2句
  selected.push(...sentences.slice(0, Math.min(2, total)))
  // 中间1-2句
  if (total > 4) {
    const mid = Math.floor(total / 2)
    selected.push(...sentences.slice(mid, Math.min(mid + 2, total)))
  }
  // 结尾1-2句
  if (total > 3) {
    const tailStart = Math.max(0, total - 2)
    const tail = sentences.slice(tailStart)
    // 避免和开头重复
    for (const s of tail) {
      if (!selected.includes(s)) selected.push(s)
    }
  }
  // 去重并拼接
  const unique = [...new Set(selected)]
  let result = unique.join('。') + '。'
  // 限制长度
  if (result.length > 600) {
    result = result.slice(0, 600) + '...'
  }
  return result
}

// ===== PDF 导入自动识别 =====
async function handlePdfUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  pdfLoading.value = true
  pdfHint.value = ''
  pdfHintOk.value = false

  try {
    // 1. 解析 PDF 文本
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = resolve
        script.onerror = () => reject(new Error('pdf.js 加载失败'))
        document.head.appendChild(script)
      })
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ''
    const pagesToRead = Math.min(pdf.numPages, 3)
    for (let i = 1; i <= pagesToRead; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')
      fullText += pageText + '\n'
    }

    const extracted = parsePdfText(fullText, file.name)

    // A 方案：抓到 DOI 时用 Crossref 反查权威元数据（免费、支持 CORS、无需 key），失败则退回正则结果
    let crossref = null
    let usedCrossref = false
    if (extracted.doi) {
      try {
        crossref = await fetchCrossrefMetadata(extracted.doi)
        usedCrossref = !!(crossref && (crossref.title || crossref.authors || crossref.journal))
      } catch (e) {
        console.warn('Crossref 反查失败，退回正则解析：', e)
      }
    }

    // 填充：Crossref 权威数据优先，正则结果兜底
    const fieldPairs = [
      ['title', 'title', '题目'],
      ['authors', 'authors', '作者'],
      ['journal', 'journal', '期刊'],
      ['year', 'year', '年份'],
      ['doi', 'doi', 'DOI'],
      ['mainContent', 'abstract', '摘要'],
    ]
    let filled = []
    for (const [formField, crField, label] of fieldPairs) {
      const crVal = crossref && crossref[crField]
      const rxVal = extracted[crField]
      if (crVal && !paperForm.value[formField]) { paperForm.value[formField] = crVal; filled.push(label) }
      else if (rxVal && !paperForm.value[formField]) { paperForm.value[formField] = rxVal; filled.push(label) }
    }

    // 2. 保存 PDF 到本地目录（未配置存放目录时自动存入浏览器本地数据库）
    try {
      const paperId = editingPaper.value?.id || 'new_' + Date.now()
      const savedName = await savePdfToDir(file, paperId)
      paperForm.value.pdfFileName = savedName
      filled.push('PDF 已保存到本地')
    } catch (e) {
      console.warn('PDF 保存失败:', e)
      filled.push('PDF 仅解析（保存失败）')
    }

    if (filled.length > 0) {
      const suffix = usedCrossref ? '（Crossref 已补全，共解析 ' + pdf.numPages + ' 页）' : '（共解析 ' + pdf.numPages + ' 页）'
      pdfHint.value = '' + filled.join('、') + suffix
      pdfHintOk.value = true
      if (paperForm.value.journal && easyscholarKey.value) autoQueryJournalImpact()
    } else {
      pdfHint.value = '未能从 PDF 中自动识别信息，请手动填写'
      pdfHintOk.value = false
    }
  } catch (e) {
    console.error('PDF parse failed:', e)
    pdfHint.value = 'PDF 解析失败：' + (e.message || '未知错误，请尝试手动填写')
    pdfHintOk.value = false
  } finally {
    pdfLoading.value = false
    if (e && e.target) e.target.value = ''
  }
}

// ===== 仅关联 PDF（不解析填表）=====
async function handlePdfLinkOnly(e) {
  const file = e.target.files?.[0]
  if (!file) return
  pdfLoading.value = true
  pdfHint.value = ''
  pdfHintOk.value = false
  try {
    const paperId = editingPaper.value?.id || 'new_' + Date.now()
    const savedName = await savePdfToDir(file, paperId)
    paperForm.value.pdfFileName = savedName
    pdfHint.value = 'PDF 已保存到本地（' + savedName + '），可在论文详情中打开'
    pdfHintOk.value = true
  } catch (err) {
    console.error('PDF 关联失败:', err)
    pdfHint.value = 'PDF 保存失败：' + (err.message || '未知错误')
    pdfHintOk.value = false
  } finally {
    pdfLoading.value = false
    if (e && e.target) e.target.value = ''
  }
}

// ===== 移除已关联的 PDF（仅取消引用，保留实际文件）=====
function removePaperPdf() {
  paperForm.value.pdfFileName = ''
  pdfHint.value = '已取消关联（原文件仍保留在存储中）'
  pdfHintOk.value = true
}

function parsePdfText(text, filename) {
  const result = {}
  text = text.replace(/\s+/g, ' ').trim()

  const nameNoExt = filename.replace(/\.pdf$/i, '')
  const nameParts = nameNoExt.split(/[-_–—]/).filter(p => p.trim().length > 2)
  if (nameParts.length >= 1 && !/^\d+$/.test(nameParts[0])) {
    result.title = nameParts[0].trim()
  }

  const doiMatch = text.match(/\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+\b/i)
  if (doiMatch) result.doi = doiMatch[0].replace(/[;.,]+$/, '')

  const lines = text.split(/[.\n](?:\s*)/).filter(l => l.trim().length > 8)
  if (lines.length > 0 && !result.title) {
    const firstLine = lines[0].trim()
    if (firstLine.length > 15 && firstLine.length < 300 && !/^(abstract|摘要|introduction|introduction|keywords|关键词)/i.test(firstLine)) {
      result.title = firstLine
    }
  }

  const authorMatch = text.match(/(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s*,\s*[A-Z][a-z]+(?:\s+[A-Z]\.?)?){1,10})/)
  if (authorMatch && !/^(Abstract|Introduction|Keywords|References)/i.test(authorMatch[1])) {
    result.authors = authorMatch[1].trim()
  }

  const yearMatch = text.match(/\b(19|20)\d{2}\b/)
  if (yearMatch) result.year = yearMatch[0]

  const journalPatterns = [
    /(?:journal|Journal)[:\s]+([A-Z][\w\s&,.-]+)/i,
    /(?:published in|Published in)[:\s]+([A-Z][\w\s&,.-]+)/i,
  ]
  for (const pat of journalPatterns) {
    const m = text.match(pat)
    if (m && m[1].trim().length > 3 && m[1].trim().length < 100) {
      result.journal = m[1].trim()
      break
    }
  }

  const absMatch = text.match(/(?:abstract|摘要)[:\s]*([\s\S]{50,800}?)(?=(?:\n\s*(?:keywords|关键词|introduction|引言|1\.|I\.|references|参考文献)|\b10\.\d{4,}))/i)
  if (absMatch && absMatch[1].trim().length > 20) {
    result.abstract = absMatch[1].trim().replace(/\s+/g, ' ').slice(0, 500)
  }

  return result
}

// ===== Crossref 元数据反查（DOI → 权威元数据）=====
// 免费、支持 CORS、无需 API key；国内访问可能偏慢，失败则自动退回正则解析
async function fetchCrossrefMetadata(doi) {
  const url = 'https://api.crossref.org/works/' + encodeURIComponent(doi) + '?mailto=workbench@example.com'
  const resp = await fetch(url)
  if (!resp.ok) throw new Error('HTTP ' + resp.status)
  const data = await resp.json()
  const m = (data && data.message) || {}
  const result = {}
  if (m.title && m.title[0]) result.title = m.title[0]
  if (Array.isArray(m.author) && m.author.length) {
    result.authors = m.author
      .map(a => [a.given, a.family].filter(Boolean).join(' '))
      .filter(Boolean)
      .join('; ')
  }
  if (m['container-title'] && m['container-title'][0]) result.journal = m['container-title'][0]
  const dateInfo = m['published-print'] || m['published-online'] || m.issued || {}
  const dp = dateInfo['date-parts']
  if (dp && dp[0] && dp[0][0]) result.year = String(dp[0][0])
  if (m.DOI) result.doi = m.DOI
  if (m.abstract) result.abstract = m.abstract.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return result
}

// ===== 打开 PDF（外部软件：Edge / 自定义）=====
async function openPaperPdfExternal(paper) {
  if (!paper.pdfFileName) {
    alert('该文献未关联 PDF 文件')
    return
  }
  await initPdfDir()
  const pdfInfo = getPdfDirInfo()
  try {
    const exists = await pdfExists(paper.pdfFileName)
    if (!exists) {
      const tip = pdfInfo.active
        ? '请确认文件是否仍在「' + pdfInfo.name + '」目录中。'
        : '若在网页端，PDF 可能仅存于本机浏览器（IndexedDB），换浏览器或清理缓存会丢失；也可在「平台设置」配置 PDF 存放目录后重新关联本文件。'
      alert('PDF 文件不存在：' + paper.pdfFileName + '\n' + tip)
      return
    }
    // Tauri 桌面环境：确保 PDF 已落盘本地目录，然后用系统默认程序或自定义软件打开
    if (isTauriRuntime()) {
      // 优先把文件落到本地 PDF 目录（历史数据可能在 IndexedDB）
      const diskPath = await ensurePdfOnDisk(paper.pdfFileName)
      if (!diskPath) {
        alert('PDF 文件不存在：' + paper.pdfFileName + '\n请重新关联该文献的 PDF 文件。')
        return
      }
      const opener = settingsStore.pdfOpener || 'browser'
      // 已配置自定义软件路径 → 用该软件打开；否则用系统默认程序
      if (opener === 'custom' && settingsStore.pdfOpenerPath) {
        try {
          await openWithApp(settingsStore.pdfOpenerPath, diskPath)
          return
        } catch (e) {
          alert('用自定义软件打开失败：' + (e.message || '未知错误') + '\n\n将改用系统默认 PDF 阅读器打开。')
        }
      }
      await openPath(diskPath)
      return
    }
    // 浏览器环境保持原逻辑
    const result = await openPdfFromDir(paper.pdfFileName)
    const opener = settingsStore.pdfOpener || 'browser'
    if (opener === 'browser') {
      window.open(result.url, '_blank')
    } else {
      // 自定义软件：Web 端优先走本地桥接服务，离线则下载兜底
      const bridgeOnline = await checkBridgeOnline()
      if (bridgeOnline) {
        const r = await openPdfViaBridge(result.url, paper.pdfFileName, settingsStore.pdfOpenerPath || '', settingsStore.bridgeSaveDir || '')
        if (r.ok) {
          alert('已通过本地桥接服务，用「' + (r.app || '系统默认程序') + '」打开：\n' + (r.file || ''))
          return
        }
        alert('本地桥接服务调用失败：' + (r.error || '未知错误') + '\n已改为下载 PDF，请手动用阅读器打开。')
      }
      const a = document.createElement('a')
      a.href = result.url
      a.download = paper.pdfFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      alert('PDF 已下载到本地，请用你设置的阅读器打开：' + (settingsStore.pdfOpenerPath || '（系统默认关联程序）') + '\n\n提示：如需「一键跳转自定义软件」，可在平台设置中下载并启动本地桥接服务（免安装，仅需 Node.js）。')
    }
  } catch (e) {
    alert('打开 PDF 失败：' + (e.message || '未知错误'))
  }
}

// ===== 平台批注 PDF（内置阅读器：批注、翻译、下划线）=====
async function openPaperPdfAnnotate(paper) {
  if (!paper.pdfFileName) {
    alert('该文献未关联 PDF 文件')
    return
  }
  await initPdfDir()
  const pdfInfo = getPdfDirInfo()
  try {
    const exists = await pdfExists(paper.pdfFileName)
    if (!exists) {
      const tip = pdfInfo.active
        ? '请确认文件是否仍在「' + pdfInfo.name + '」目录中。'
        : '若在网页端，PDF 可能仅存于本机浏览器（IndexedDB），换浏览器或清理缓存会丢失；也可在「平台设置」配置 PDF 存放目录后重新关联本文件。'
      alert('PDF 文件不存在：' + paper.pdfFileName + '\n' + tip)
      return
    }
    const result = await openPdfFromDir(paper.pdfFileName)
    currentPdfUrl.value = result.url
    currentPdfName.value = paper.pdfFileName
    currentPdfPaperId.value = paper.id
    pdfReaderVisible.value = true
  } catch (e) {
    alert('打开 PDF 失败：' + (e.message || '未知错误'))
  }
}

// 兼容旧调用（默认外部打开）
async function openPaperPdf(paper) {
  return openPaperPdfExternal(paper)
}

// ===== 图表 =====
const chartRef = ref(null)
let chartInstance = null

const chartData = computed(() => {
  return paperLibraryStore.sortedStatuses
    .map(s => ({
      name: s.name,
      value: paperLibraryStore.statusSummary[s.id]?.count || 0,
      itemStyle: { color: s.color },
      statusId: s.id,
    }))
    .filter(d => d.value > 0)
})

function getStatusName(statusId) {
  return paperLibraryStore.statuses.find(s => s.id === statusId)?.name || statusId
}

function initChart() {
  if (!chartRef.value) return
  if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  chartInstance = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chartInstance) return
  const data = chartData.value
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E7EB',
      textStyle: { color: '#1F2937', fontSize: 13 },
      formatter: (params) => {
        const summary = paperLibraryStore.statusSummary[params.data.statusId]
        const papers = summary?.papers || []
        const list = papers.slice(0, 3).map(p => '• ' + p.title.slice(0, 26) + (p.title.length > 26 ? '...' : '')).join('<br/>')
        const more = papers.length > 3 ? '<br/>...还有 ' + (papers.length - 3) + ' 篇' : ''
        return '<div style="font-weight:600;margin-bottom:4px;">' + params.name + '：' + params.value + ' 篇 (' + params.percent + '%)</div>' +
                '<div style="font-size:12px;color:#6B7280;line-height:1.6;">' + list + more + '</div>'
      },
    },
    series: [{
      type: 'pie', radius: ['42%', '68%'], center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#FFFFFF', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{c}篇', color: '#6B7280', fontSize: 12 },
      labelLine: { lineStyle: { color: '#D1D5DB' } },
      data: data.length > 0 ? data : [{ name: '暂无数据', value: 1, itemStyle: { color: '#E5E7EB' } }],
    }],
  }
  chartInstance.setOption(option, true)
}

watch(activeTab, async (val) => { if (val === 'overview') { await nextTick(); initChart() } })
watch(() => paperLibraryStore.papers, () => { if (activeTab.value === 'overview') nextTick(() => updateChart()) }, { deep: true })

onMounted(() => {
  if (activeTab.value === 'overview') nextTick(() => initChart())
  window.addEventListener('resize', resizeChart)
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleTableScrollClose, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleTableScrollClose, true)
  if (chartInstance) { chartInstance.dispose(); chartInstance = null }
  if (journalDebounceTimer) clearTimeout(journalDebounceTimer)
})

function resizeChart() { chartInstance?.resize() }

// ===== 弹窗操作 =====
function openAddPaper() {
  editingPaper.value = null
  paperForm.value = emptyForm()
  paperFormDraft.value = null
  journalResult.value = null
  journalError.value = ''
  lastAutoQueriedJournal = ''
  pdfHint.value = ''
  pdfHintOk.value = false
  showPaperModal.value = true
}

function openEditPaper(paper) {
  // 关闭详情弹窗
  if (showDetailModal.value) closeDetailModal()

  editingPaper.value = paper
  paperFormDraft.value = null
  paperForm.value = {
    title: paper.title || '',
    year: paper.year || '',
    unit: paper.unit || '',
    journal: paper.journal || '',
    impact: paper.impact || '',
    mainContent: paper.mainContent || '',
    innovation: paper.innovation || '',
    status: paper.status || paperLibraryStore.statuses[0]?.id || 'pending',
    authors: paper.authors || '',
    doi: paper.doi || '',
    tags: paper.tags ? [...paper.tags] : [],
    readingLevel: paper.readingLevel || 'skim',
    coreConclusion: paper.coreConclusion || '',
    personalInsight: paper.personalInsight || '',
    followUpAction: paper.followUpAction || '',
    pdfFileName: paper.pdfFileName || '',
  }
  journalResult.value = null
  journalError.value = ''
  lastAutoQueriedJournal = ''
  pdfHint.value = ''
  pdfHintOk.value = false
  showPaperModal.value = true
}

function closePaperModal() {
  showPaperModal.value = false
  editingPaper.value = null
  paperFormDraft.value = null
  journalResult.value = null
  journalError.value = ''
  lastAutoQueriedJournal = ''
  if (journalDebounceTimer) clearTimeout(journalDebounceTimer)
}

function savePaper() {
  if (!paperForm.value.title.trim()) {
    alert('请输入论文题目')
    return
  }
  const formData = { ...paperForm.value }
  if (editingPaper.value) {
    paperLibraryStore.updatePaper(editingPaper.value.id, formData)
  } else {
    paperLibraryStore.addPaper(formData)
  }
  closePaperModal()
}

function deletePaper(paper) {
  if (confirm('确定删除文献「' + (paper.title || '未命名') + '」吗？')) {
    paperLibraryStore.deletePaper(paper.id)
    if (editingPaper.value?.id === paper.id) closePaperModal()
  }
}

function updateStatus(paper, status) {
  paperLibraryStore.updatePaper(paper.id, { status })
}

// ===== 文献详情弹窗（只读） =====
function openDetailPaper(paper) {
  detailPaper.value = paper
  showDetailModal.value = true
}

function closeDetailModal() {
  showDetailModal.value = false
  detailPaper.value = null
}

// ===== 导出 =====
function exportMarkdown() {
  showExportMenu.value = false
  const papers = filteredPapers.value
  if (papers.length === 0) { alert('没有可导出的文献'); return }
  let md = '# 文献笔记导出\n\n> 导出时间：' + new Date().toLocaleString() + '  |  共 ' + papers.length + ' 篇文献\n\n---\n\n'
  papers.forEach((p, i) => {
    md += '## ' + (i + 1) + '. ' + p.title + '\n\n| 字段 | 内容 |\n|------|------|\n'
    md += '| 状态 | ' + getStatusName(p.status) + ' |\n'
    if (p.authors) md += '| 作者 | ' + p.authors + ' |\n'
    if (p.year) md += '| 年份 | ' + p.year + ' |\n'
    if (p.journal) md += '| 期刊 | ' + p.journal + ' |\n'
    if (p.impact) md += '| 影响 | ' + p.impact + ' |\n'
    if (p.doi) md += '| DOI | ' + p.doi + ' |\n'
    if (p.tags?.length) md += '| 标签 | ' + p.tags.join(', ') + ' |\n'
    if (p.mainContent) md += '\n### 主要内容\n\n' + p.mainContent + '\n'
    if (p.innovation) md += '\n### 可借鉴创新点\n\n' + p.innovation + '\n'
    md += '\n---\n\n'
  })
  const blob = new Blob(['\uFEFF' + md], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, '文献笔记_' + todayStr() + '.md')
}

function exportPdf() {
  showExportMenu.value = false
  const papers = filteredPapers.value
  if (papers.length === 0) { alert('没有可导出的文献'); return }
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>文献笔记</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;padding:40px;color:#1F2937;max-width:900px;margin:0 auto}' +
    'h1{font-size:26px;margin-bottom:8px}.meta{color:#9CA3AF;font-size:13px;margin-bottom:30px}' +
    '.paper{margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #E5E7EB;page-break-inside:avoid}' +
    '.paper h2{font-size:18px;margin-bottom:8px}.info{color:#6B7280;font-size:13px;line-height:1.8;margin-bottom:10px}' +
    '.section{margin-top:12px}.section h3{font-size:15px;color:#5B5FEF;margin-bottom:6px;font-weight:600}.section p{font-size:14px;line-height:1.8;color:#374151}' +
    '.tag{display:inline-block;background:#EEF2FF;color:#5B5FEF;padding:2px 8px;border-radius:12px;font-size:12px;margin-right:4px}' +
    '@media print{body{padding:20px}.paper{page-break-inside:avoid}}</style></head><body>' +
    '<h1>文献笔记</h1><div class="meta">导出时间：' + new Date().toLocaleString() + ' &nbsp;|&nbsp; 共 ' + papers.length + ' 篇文献</div>'
  papers.forEach((p, i) => {
    html += '<div class="paper"><h2>' + (i + 1) + '. ' + escapeHtml(p.title) + '</h2><div class="info">'
    if (p.authors) html += '作者：' + escapeHtml(p.authors) + ' &nbsp;|&nbsp; '
    if (p.year) html += '年份：' + p.year + ' &nbsp;|&nbsp; '
    if (p.journal) html += '期刊：' + escapeHtml(p.journal) + ' &nbsp;|&nbsp; '
    if (p.impact) html += '影响：' + escapeHtml(p.impact) + ' &nbsp;|&nbsp; '
    html += '状态：' + getStatusName(p.status) + '</div>'
    if (p.tags?.length) html += '<div>' + p.tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('') + '</div>'
    if (p.mainContent) html += '<div class="section"><h3>主要内容</h3><p>' + escapeHtml(p.mainContent) + '</p></div>'
    if (p.innovation) html += '<div class="section"><h3>可借鉴创新点</h3><p>' + escapeHtml(p.innovation) + '</p></div>'
    html += '</div>'
  })
  html += '</body></html>'
  printHtml(html)
}

// ============================================================
// 论文阅读（新增模块）
// ============================================================
const showReadingModal = ref(false)
const editingReading = ref(null)
const newReadingTagInput = ref('')
const showReadingTagSuggest = ref(false)
const showReadingConfigModal = ref(false)
const showReadingExportMenu = ref(false)
const showReadingDetailModal = ref(false)
const detailReading = ref(null)
const readingSearchQuery = ref('')
const newReadingCustomFieldName = ref('')
const newReadingCustomFieldType = ref('text')
const readingFilterTags = ref([])

const readingTagOptions = computed(() => {
  const tags = new Set()
  paperReadingsStore.readings.forEach(r => {
    if (r.tags && Array.isArray(r.tags)) r.tags.forEach(t => tags.add(t))
  })
  return [...tags].sort()
})

const readingSortField = computed({
  get: () => paperReadingsStore.sortField,
  set: (v) => paperReadingsStore.setSortField(v)
})

const emptyReadingForm = () => ({
  paperId: '',
  title: '',
  year: '',
  researchObject: '',
  researchPurpose: '',
  researchMethod: '',
  innovation: '',
  referenceIdeas: '',
  tags: [],
})
const readingForm = ref(emptyReadingForm())

// 阅读表格基础列
const READING_BASE_COLUMNS = [
  { key: 'title', label: '论文题目' },
  { key: 'year', label: '年份' },
  { key: 'researchObject', label: '研究对象' },
  { key: 'researchPurpose', label: '研究目的' },
  { key: 'researchMethod', label: '研究方法' },
  { key: 'innovation', label: '创新点' },
  { key: 'referenceIdeas', label: '可借鉴思路' },
  { key: 'tags', label: '标签' },
]

// 列定义（按 visibleColumns 顺序 + 自定义字段）
const readingColumnList = computed(() => {
  const custom = (paperReadingsStore.customFields || []).map(f => ({ key: f.key, label: f.label, custom: true }))
  const allCols = [...READING_BASE_COLUMNS, ...custom]
  const colMap = {}
  allCols.forEach(c => { colMap[c.key] = c })
  const result = []
  for (const key of paperReadingsStore.visibleColumns) {
    if (colMap[key]) result.push(colMap[key])
  }
  for (const c of allCols) {
    if (!result.find(r => r.key === c.key)) result.push(c)
  }
  return result
})

function readingColumnVisibleCfg(key) {
  return paperReadingsStore.visibleColumns.includes(key)
}
function toggleReadingColumnCfg(key) {
  const cols = [...paperReadingsStore.visibleColumns]
  const idx = cols.indexOf(key)
  if (idx >= 0) cols.splice(idx, 1)
  else cols.push(key)
  paperReadingsStore.setVisibleColumns(cols)
}
function moveReadingColumnCfg(i, dir) {
  const options = readingColumnList.value
  const fromKey = options[i].key
  const cols = [...paperReadingsStore.visibleColumns]
  const fromPos = cols.indexOf(fromKey)
  const targetIdx = i + dir
  if (fromPos >= 0) {
    if (targetIdx < cols.length) {
      cols.splice(fromPos, 1)
      cols.splice(targetIdx, 0, fromKey)
    }
  } else if (targetIdx >= 0 && targetIdx < cols.length) {
    cols.splice(targetIdx, 0, fromKey)
  }
  paperReadingsStore.setVisibleColumns(cols)
}
function resetReadingColumnsCfg() {
  const customKeys = (paperReadingsStore.customFields || []).map(f => f.key)
  paperReadingsStore.setVisibleColumns([...READING_BASE_COLUMNS.map(c => c.key), ...customKeys])
}

function toggleReadingCustomFieldCfg(cf) {
  paperReadingsStore.updateCustomField(cf.key, { enabled: !cf.enabled })
}
function addReadingCustomFieldCfg() {
  const name = newReadingCustomFieldName.value.trim()
  if (!name) return
  paperReadingsStore.addCustomField({ label: name, type: newReadingCustomFieldType.value })
  newReadingCustomFieldName.value = ''
  newReadingCustomFieldType.value = 'text'
}
function deleteReadingCustomFieldCfg(cf) {
  if (confirm(`确定删除自定义字段「${cf.label}」吗？`)) paperReadingsStore.deleteCustomField(cf.key)
}

// 启用中的自定义字段（表单里渲染）
const enabledReadingCustomFields = computed(() => {
  return (paperReadingsStore.customFields || []).filter(f => f.enabled)
})

// 筛选：论文名 / 时间（年份 + 添加时间） / 标签
const filteredReadings = computed(() => {
  let list = paperReadingsStore.sortedReadings
  const q = readingSearchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r => {
      const inStr = (val) => (val || '').toLowerCase().includes(q)
      return inStr(r.title) || inStr(r.year) || inStr(r.createdAt) ||
        (r.tags || []).some(t => inStr(t))
    })
  }
  if (readingFilterTags.value.length > 0) {
    list = list.filter(r => {
      if (!r.tags || r.tags.length === 0) return false
      return readingFilterTags.value.some(t => r.tags.includes(t))
    })
  }
  return list
})

function toggleReadingFilterTag(tag) {
  const idx = readingFilterTags.value.indexOf(tag)
  if (idx >= 0) readingFilterTags.value.splice(idx, 1)
  else readingFilterTags.value.push(tag)
}

function clearReadingFilters() {
  readingSearchQuery.value = ''
  readingFilterTags.value = []
}

function onReadingSortChange() {
  paperReadingsStore.setSortField(readingSortField.value)
}

function toggleReadingSortDir() {
  paperReadingsStore.setSortDirection(paperReadingsStore.sortDirection === 'desc' ? 'asc' : 'desc')
}
function toggleReadingExportMenu() {
  showReadingExportMenu.value = !showReadingExportMenu.value
}

function onReadingLinkPaper() {
  const pid = readingForm.value.paperId
  if (pid) {
    const p = paperLibraryStore.papers.find(x => x.id === pid)
    if (p) {
      readingForm.value.title = p.title || readingForm.value.title
      readingForm.value.year = p.year || readingForm.value.year
    }
  }
}

function openAddReading() {
  editingReading.value = null
  readingForm.value = emptyReadingForm()
  showReadingModal.value = true
}

function openEditReading(reading) {
  if (showReadingDetailModal.value) closeReadingDetail()
  editingReading.value = reading
  readingForm.value = {
    paperId: reading.paperId || '',
    title: reading.title || '',
    year: reading.year || '',
    researchObject: reading.researchObject || '',
    researchPurpose: reading.researchPurpose || '',
    researchMethod: reading.researchMethod || '',
    innovation: reading.innovation || '',
    referenceIdeas: reading.referenceIdeas || '',
    tags: reading.tags ? [...reading.tags] : [],
  }
  showReadingModal.value = true
}

function closeReadingModal() {
  showReadingModal.value = false
  editingReading.value = null
}

function saveReading() {
  if (!readingForm.value.title.trim()) {
    alert('请输入论文题目')
    return
  }
  const formData = { ...readingForm.value }
  if (editingReading.value) {
    paperReadingsStore.updateReading(editingReading.value.id, formData)
  } else {
    paperReadingsStore.addReading(formData)
  }
  closeReadingModal()
}

function deleteReading(reading) {
  if (confirm('确定删除阅读记录「' + (reading.title || '未命名') + '」吗？')) {
    paperReadingsStore.deleteReading(reading.id)
    if (editingReading.value?.id === reading.id) closeReadingModal()
  }
}

// 标签输入
const availableReadingTags = computed(() => {
  const q = (newReadingTagInput.value || '').trim().toLowerCase()
  const selected = readingForm.value.tags || []
  return paperReadingsStore.allTags().filter(t => !selected.includes(t) && (!q || t.toLowerCase().includes(q)))
})
function toggleReadingFormTag(tag) {
  if (!readingForm.value.tags.includes(tag)) {
    readingForm.value.tags.push(tag)
    if (!paperLibraryStore.getTagColor(tag)) paperLibraryStore.setTagColor(tag, defaultTagColor())
  }
  showReadingTagSuggest.value = true
}
function onReadingTagInputBlur() {
  setTimeout(() => { showReadingTagSuggest.value = false }, 120)
}
function addReadingFormTag() {
  const tag = newReadingTagInput.value.trim()
  if (tag && !readingForm.value.tags.includes(tag)) {
    readingForm.value.tags.push(tag)
    if (!paperLibraryStore.getTagColor(tag)) {
      paperLibraryStore.setTagColor(tag, defaultTagColor())
    }
  }
  newReadingTagInput.value = ''
}
function removeReadingFormTag(i) { readingForm.value.tags.splice(i, 1) }
function handleReadingTagBackspace() {
  if (!newReadingTagInput.value && readingForm.value.tags.length > 0) readingForm.value.tags.pop()
}

// 详情弹窗（单击行触发）
function onReadingRowClick(reading) {
  openReadingDetail(reading)
}
function openReadingDetail(reading) {
  detailReading.value = reading
  showReadingDetailModal.value = true
}
function closeReadingDetail() {
  showReadingDetailModal.value = false
  detailReading.value = null
}
const detailLinkedPaper = computed(() => {
  if (!detailReading.value || !detailReading.value.paperId) return null
  return paperLibraryStore.papers.find(p => p.id === detailReading.value.paperId) || null
})

function readingCellTitle(r, colKey) {
  if (colKey === 'title') return r.title || ''
  if (colKey === 'tags') return (r.tags || []).join(', ')
  return (r[colKey] || '')
}

function formatReadingTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
    ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// 导出（Markdown）
function exportReadingsMarkdown() {
  showReadingExportMenu.value = false
  const records = filteredReadings.value
  if (records.length === 0) { alert('没有可导出的阅读记录'); return }
  let md = '# 论文阅读记录导出\n\n> 导出时间：' + new Date().toLocaleString() + '  |  共 ' + records.length + ' 条记录\n\n---\n\n'
  records.forEach((r, i) => {
    md += '## ' + (i + 1) + '. ' + r.title + '\n\n| 字段 | 内容 |\n|------|------|\n'
    if (r.year) md += '| 年份 | ' + r.year + ' |\n'
    if (r.paperId) {
      const p = paperLibraryStore.papers.find(x => x.id === r.paperId)
      if (p) {
        md += '| 关联文献 | ' + p.title + ' |\n'
        if (p.authors) md += '| 作者 | ' + p.authors + ' |\n'
        if (p.journal) md += '| 期刊 | ' + p.journal + ' |\n'
        if (p.impact) md += '| 影响/分区 | ' + p.impact + ' |\n'
      }
    }
    if (r.tags?.length) md += '| 标签 | ' + r.tags.join(', ') + ' |\n'
    if (r.researchObject) md += '\n### 研究对象\n\n' + r.researchObject + '\n'
    if (r.researchPurpose) md += '\n### 研究目的\n\n' + r.researchPurpose + '\n'
    if (r.researchMethod) md += '\n### 研究方法\n\n' + r.researchMethod + '\n'
    if (r.innovation) md += '\n### 创新点\n\n' + r.innovation + '\n'
    if (r.referenceIdeas) md += '\n### 可借鉴思路\n\n' + r.referenceIdeas + '\n'
    md += '\n---\n\n'
  })
  const blob = new Blob(['\uFEFF' + md], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, '论文阅读记录_' + todayStr() + '.md')
}

// 导出（PDF 打印）
function exportReadingsPdf() {
  showReadingExportMenu.value = false
  const records = filteredReadings.value
  if (records.length === 0) { alert('没有可导出的阅读记录'); return }
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>论文阅读记录</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;padding:40px;color:#1F2937;max-width:900px;margin:0 auto}' +
    'h1{font-size:26px;margin-bottom:8px}.meta{color:#9CA3AF;font-size:13px;margin-bottom:30px}' +
    '.rec{margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #E5E7EB;page-break-inside:avoid}' +
    '.rec h2{font-size:18px;margin-bottom:8px}.info{color:#6B7280;font-size:13px;line-height:1.8;margin-bottom:10px}' +
    '.section{margin-top:12px}.section h3{font-size:15px;color:#5B5FEF;margin-bottom:6px;font-weight:600}.section p{font-size:14px;line-height:1.8;color:#374151}' +
    '.tag{display:inline-block;background:#EEF2FF;color:#5B5FEF;padding:2px 8px;border-radius:12px;font-size:12px;margin-right:4px}' +
    '@media print{body{padding:20px}.rec{page-break-inside:avoid}}</style></head><body>' +
    '<h1>论文阅读记录</h1><div class="meta">导出时间：' + new Date().toLocaleString() + ' &nbsp;|&nbsp; 共 ' + records.length + ' 条记录</div>'
  records.forEach((r, i) => {
    html += '<div class="rec"><h2>' + (i + 1) + '. ' + escapeHtml(r.title) + '</h2><div class="info">'
    if (r.year) html += '年份：' + r.year + ' &nbsp;|&nbsp; '
    html += '添加时间：' + formatReadingTime(r.createdAt) + '</div>'
    if (r.paperId) {
      const p = paperLibraryStore.papers.find(x => x.id === r.paperId)
      if (p) html += '<div class="info">关联文献：' + escapeHtml(p.title) + (p.authors ? '（' + escapeHtml(p.authors) + '）' : '') + (p.impact ? ' &nbsp;|&nbsp; ' + escapeHtml(p.impact) : '') + '</div>'
    }
    if (r.tags?.length) html += '<div>' + r.tags.map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join('') + '</div>'
    if (r.researchObject) html += '<div class="section"><h3>研究对象</h3><p>' + escapeHtml(r.researchObject) + '</p></div>'
    if (r.researchPurpose) html += '<div class="section"><h3>研究目的</h3><p>' + escapeHtml(r.researchPurpose) + '</p></div>'
    if (r.researchMethod) html += '<div class="section"><h3>研究方法</h3><p>' + escapeHtml(r.researchMethod) + '</p></div>'
    if (r.innovation) html += '<div class="section"><h3>创新点</h3><p>' + escapeHtml(r.innovation) + '</p></div>'
    if (r.referenceIdeas) html += '<div class="section"><h3>可借鉴思路</h3><p>' + escapeHtml(r.referenceIdeas) + '</p></div>'
    html += '</div>'
  })
  html += '</body></html>'
  printHtml(html)
}

// 笔记相关
const notesSearch = ref('')
const editingNoteId = ref(null)
const showNoteEditor = ref(false)
const noteForm = ref({ title: '', content: '', paperId: '', folderId: '' })
const noteEditorRef = ref(null)

// 文件夹相关
const currentFolder = ref('__uncategorized') // 当前选中文件夹
const expandedFolders = ref(new Set()) // 已展开的文件夹ID
const renamingFolder = ref(null) // 正在重命名的文件夹ID
const renameText = ref('')
const dragOverFolder = ref(null)
const dragNote = ref(null)

// 颜色选择器（Office 风格）
const activeColorPicker = ref(null) // 'text' | 'highlight'
const currentTextColor = ref('#1F2937')
const currentHighlightColor = ref('#FCD34D')
const customTextColor = ref('#1F2937')
const customHighlightColor = ref('#FCD34D')
const savedSelection = ref(null) // 保存选区，防止点击工具按钮后丢失

// 字号（Word 风格：初号/小初/一号/小一...八号）
const fontSizeOptions = [
  { value: '42px', label: '初号' },
  { value: '36px', label: '小初' },
  { value: '26px', label: '一号' },
  { value: '24px', label: '小一' },
  { value: '22px', label: '二号' },
  { value: '18px', label: '小二' },
  { value: '16px', label: '三号' },
  { value: '15px', label: '小三' },
  { value: '14px', label: '四号' },
  { value: '12px', label: '小四' },
  { value: '10.5px', label: '五号' },
  { value: '9px', label: '小五' },
  { value: '8px', label: '六号' },
  { value: '7px', label: '小六' },
  { value: '6px', label: '七号' },
  { value: '5px', label: '八号' }
]
const currentFontSize = ref('16px')

// 对齐
const activeAlign = ref(null) // 'left' | 'center' | 'right'

// 特殊符号
const showSymbolPanel = ref(false)
const symbolGroups = [
  { title: '希腊字母（小写）', symbols: ['α','β','γ','δ','ε','ζ','η','θ','λ','μ','π','σ','τ','φ','ω'] },
  { title: '希腊字母（大写）', symbols: ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Λ','Μ','Π','Σ','Τ','Φ','Ω'] },
  { title: '数学符号', symbols: ['±','×','÷','≈','≠','≤','≥','∞','∂','∇','∫','∑','∏','√','∈'] },
  { title: '常用箭头', symbols: ['→','←','↑','↓','↔','⇒','⇐','⇔','↗','↘','↙','↖'] }
]

// 公式输入
const showFormulaInput = ref(false)
const formulaLatex = ref('')
const formulaPreview = ref('')
const formulaTab = ref('latex') // 'latex' | 'wysiwyg'
const formulaWysiwygSymbols = ['±','×','÷','≈','≠','≤','≥','∞','∂','∇','∫','∑','∏','√','∈','∉','∪','∩','⊂','⊃','∅','°','′','″','∠','⊥','∥','∼','≅','≡','∀','∃','∴','∵','→','←','↑','↓','↔','⇒','⇐','⇔']
const formulaWysiwygStructures = [
  { name: '分式', latex: '\\frac{a}{b}', preview: '<span style="font-size:16px;"><sup>a</sup>&frasl;<sub>b</sub></span>' },
  { name: '上标', latex: 'x^{2}', preview: '<span style="font-size:16px;">x<sup>2</sup></span>' },
  { name: '下标', latex: 'x_{i}', preview: '<span style="font-size:16px;">x<sub>i</sub></span>' },
  { name: '根式', latex: '\\sqrt{x}', preview: '<span style="font-size:16px;">√x</span>' },
  { name: 'n次根式', latex: '\\sqrt[n]{x}', preview: '<span style="font-size:16px;"><sup>n</sup>√x</span>' },
  { name: '积分', latex: '\\int_{a}^{b} f(x)dx', preview: '<span style="font-size:16px;">∫<sub>a</sub><sup>b</sup></span>' },
  { name: '求和', latex: '\\sum_{i=1}^{n} x_i', preview: '<span style="font-size:16px;">∑<sub>i=1</sub><sup>n</sup></span>' },
  { name: '极限', latex: '\\lim_{x \\to \\infty} f(x)', preview: '<span style="font-size:16px;">lim</span>' },
  { name: '矩阵2×2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', preview: '<span style="font-size:12px;">(a b<br>c d)</span>' },
  { name: '括号', latex: '\\left( x \\right)', preview: '<span style="font-size:16px;">(x)</span>' },
]

// 笔记自动保存状态
const noteAutoSaveStatus = ref('') // 例如：'已保存于 10:36:18'
let noteAutoSaveTimer = null
let noteLastSavedAt = 0

// A4 缩放
const editorZoom = ref(1.0)

// 主题色：黑/灰列 + 6 种主色各 5 个色阶
const themeColors = [
  '#000000', '#1F2937', '#374151', '#4B5563', '#6B7280',
  '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD',
  '#9A3412', '#C2410C', '#EA580C', '#FB923C', '#FDBA74',
  '#166534', '#15803D', '#16A34A', '#4ADE80', '#86EFAC',
  '#7E22CE', '#9333EA', '#A855F7', '#C084FC', '#D8B4FE',
  '#BE185D', '#DB2777', '#EC4899', '#F472B6', '#F9A8D4'
]
// 标准色
const standardColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#14B8A6', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
]

// 笔记导航大纲：从 content 中解析 h1-h6
const noteOutline = computed(() => {
  const html = noteForm.value.content || ''
  const items = []
  const regex = /<h([1-6])(?:[^>]*)>([\s\S]*?)<\/h\1>/gi
  let m
  while ((m = regex.exec(html)) !== null) {
    const level = parseInt(m[1], 10)
    const text = m[2].replace(/<[^>]+>/g, '').trim()
    if (text) items.push({ level, text })
  }
  return items
})

// 滚动到第 n 个标题
function scrollToHeading(index) {
  const el = noteEditorRef.value
  if (!el) return
  const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const target = headings[index]
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // 临时高亮
    const oldBg = target.style.backgroundColor
    target.style.backgroundColor = 'rgba(59,130,246,0.12)'
    setTimeout(() => { target.style.backgroundColor = oldBg }, 1000)
  }
}

// 所有文件夹（用于下拉选择）
const allFoldersFlat = computed(() => {
  const result = []
  paperNotesStore.rootFolders.forEach(f => {
    result.push(f)
    paperNotesStore.childFolders(f.id).forEach(cf => result.push({ id: cf.id, name: '  └ ' + cf.name }))
  })
  return result
})

// 当前文件夹下的笔记（支持搜索）
const currentFolderNotes = computed(() => {
  let list = paperNotesStore.notesInFolder(currentFolder.value)
  if (notesSearch.value) {
    const q = notesSearch.value.toLowerCase()
    list = list.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
  }
  return list
})

// 笔记草稿恢复
const NOTE_DRAFT_KEY = 'mw_note_draft'
let noteDraftTimer = null

function autoSaveNoteDraft() {
  if (!editingNoteId.value && noteForm.value.title.trim()) {
    saveNoteDraft({ ...noteForm.value })
  }
}

function saveNoteDraft(draft) {
  try {
    localStorage.setItem(NOTE_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }))
  } catch { /* ignore */ }
}

function clearNoteDraft() {
  localStorage.removeItem(NOTE_DRAFT_KEY)
}

function loadNoteDraft() {
  try {
    const raw = localStorage.getItem(NOTE_DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (Date.now() - draft.savedAt > 86400000) {
      clearNoteDraft()
      return null
    }
    return draft
  } catch { return null }
}

watch(() => noteForm.value.title + noteForm.value.content, () => {
  if (!editingNoteId.value) {
    clearTimeout(noteDraftTimer)
    noteDraftTimer = setTimeout(autoSaveNoteDraft, 1000)
  }
})

// ===== 文件夹操作 =====
function selectFolder(folderId) {
  currentFolder.value = folderId
  // 自动展开父文件夹
  const folder = paperNotesStore.folders.find(f => f.id === folderId)
  if (folder && folder.parentId) {
    expandedFolders.value.add(folder.parentId)
  }
}

function toggleFolder(folderId) {
  const s = new Set(expandedFolders.value)
  if (s.has(folderId)) s.delete(folderId)
  else s.add(folderId)
  expandedFolders.value = s
  selectFolder(folderId)
}

function startNewFolder(parentId) {
  const name = prompt('请输入文件夹名称：')
  if (!name || !name.trim()) return
  paperNotesStore.addFolder(name.trim(), parentId || '')
  if (parentId) {
    const s = new Set(expandedFolders.value)
    s.add(parentId)
    expandedFolders.value = s
  }
}

function startRename(folder) {
  renamingFolder.value = folder.id
  renameText.value = folder.name
}

function finishRename(folderId) {
  if (renameText.value.trim()) {
    paperNotesStore.renameFolder(folderId, renameText.value.trim())
  }
  renamingFolder.value = null
  renameText.value = ''
}

function deleteFolderConfirm(folder) {
  const noteCount = paperNotesStore.notesInFolder(folder.id).length
  const childCount = paperNotesStore.childFolders(folder.id).length
  let msg = '确定删除文件夹「' + folder.name + '」？'
  if (noteCount > 0) msg += '\n（内含 ' + noteCount + ' 篇笔记将移至未分类）'
  if (childCount > 0) msg += '\n（内含 ' + childCount + ' 个子文件夹将移至根目录）'
  if (confirm(msg)) {
    paperNotesStore.deleteFolder(folder.id)
    if (currentFolder.value === folder.id) currentFolder.value = '__uncategorized'
  }
}

// ===== 笔记拖拽到文件夹 =====
function onDragNoteStart(e, note) {
  dragNote.value = note
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', note.id)
}

function handleDropNote(folderId) {
  dragOverFolder.value = null
  if (dragNote.value) {
    paperNotesStore.moveNote(dragNote.value.id, folderId)
    dragNote.value = null
  }
}

// ===== 笔记 CRUD =====
function openNewNote() {
  const draft = loadNoteDraft()
  if (draft && (draft.title || draft.content)) {
    if (confirm('检测到上次未完成的笔记草稿，是否恢复？')) {
      noteForm.value = { title: draft.title || '', content: draft.content || '', paperId: draft.paperId || '', folderId: draft.folderId || currentFolder.value === '__uncategorized' ? '' : currentFolder.value }
      editingNoteId.value = null
      showNoteEditor.value = true
      nextTick(() => { if (noteEditorRef.value) noteEditorRef.value.innerHTML = draft.content || '' })
      clearNoteDraft()
      return
    }
    clearNoteDraft()
  }
  editingNoteId.value = null
  showNoteEditor.value = true
  const fid = currentFolder.value === '__uncategorized' ? '' : currentFolder.value
  noteForm.value = { title: '', content: '', paperId: '', folderId: fid }
  clearNoteDraft()
  nextTick(() => { if (noteEditorRef.value) noteEditorRef.value.innerHTML = '' })
}

function closeNoteEditor() {
  if (!editingNoteId.value && noteForm.value.title.trim()) {
    saveNoteDraft({ ...noteForm.value })
  }
  clearTimeout(noteAutoSaveTimer)
  editingNoteId.value = null
  showNoteEditor.value = false
  noteForm.value = { title: '', content: '', paperId: '', folderId: '' }
  noteAutoSaveStatus.value = ''
}

function saveNote() {
  // 确保从 contenteditable 同步最新内容
  if (noteEditorRef.value) {
    noteForm.value.content = noteEditorRef.value.innerHTML
  }
  if (!noteForm.value.title.trim()) { alert('请输入笔记标题'); return }
  doAutoSaveNote()
  // 手动保存后不关闭编辑器，仅刷新状态
  noteAutoSaveStatus.value = '已保存于 ' + dayjs().format('HH:mm:ss')
}

function deleteNote(note) {
  if (confirm('确定删除笔记「' + note.title + '」吗？')) {
    paperNotesStore.deleteNote(note.id)
    if (editingNoteId.value === note.id) closeNoteEditor()
  }
}

function openNoteEdit(note) {
  noteForm.value = { title: note.title, content: note.content, paperId: note.paperId || '', folderId: note.folderId || '' }
  editingNoteId.value = note.id
  showNoteEditor.value = true
  noteAutoSaveStatus.value = ''
  nextTick(() => { if (noteEditorRef.value) noteEditorRef.value.innerHTML = note.content || '' })
}

function openEditNote(note) { openNoteEdit(note) }

// ===== 笔记 HTML 工具函数 =====
function getPaperTitle(paperId) {
  const p = paperLibraryStore.papers.find(x => x.id === paperId)
  return p ? p.title : ''
}

function stripHtmlTags(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatNoteTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = Date.now()
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 安全渲染笔记 HTML：仅允许基础标签/属性，换行转为 <br>
const ALLOWED_TAGS = /^(?:h1|h2|h3|h4|h5|h6|p|br|hr|strong|b|em|i|u|del|s|span|a|code|pre|blockquote|ul|ol|li)$/i
const ALLOWED_ATTRS = /^(?:href|style|target|class|data-latex)$/i
function renderNoteHtml(html) {
  if (!html) return ''
  // 先转义，再对允许的标签做简单恢复
  let safe = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  safe = safe.replace(/&lt;(\/?)([a-zA-Z0-9]+)([^&]*)&gt;/g, (match, slash, tag, attrs) => {
    if (!ALLOWED_TAGS.test(tag)) return match
    let attrStr = ''
    if (attrs) {
      const attrPairs = attrs.match(/\s+([a-zA-Z-]+)=("[^"]*"|'[^']*')/g) || []
      for (const attr of attrPairs) {
        const m = attr.match(/\s+([a-zA-Z-]+)=("[^"]*"|'[^']*')/)
        if (m && ALLOWED_ATTRS.test(m[1])) {
          const val = m[2].slice(1, -1)
          if (m[1] === 'href') {
            attrStr += ' ' + m[1] + '="' + escapeHtml(val).replace(/&amp;/g, '&') + '" target="_blank" rel="noopener"'
          } else if (m[1] === 'data-latex') {
            attrStr += ' data-latex="' + escapeHtml(val).replace(/&amp;/g, '&') + '"'
          } else if (m[1] === 'class') {
            attrStr += ' class="' + escapeHtml(val) + '"'
          } else {
            // style 仅保留 color / background-color
            const safeStyle = val.replace(/[^a-zA-Z0-9\-:#();,\.\s]/g, '')
            if (safeStyle) attrStr += ' ' + m[1] + '="' + safeStyle + '"'
          }
        }
      }
    }
    return '<' + slash + tag.toLowerCase() + attrStr + '>'
  })
  safe = safe.replace(/\n/g, '<br/>')
  // 渲染数学公式：将 <div class="math-block" data-latex="..">..</div> 中的内容替换为 KaTeX
  if (window.katex) {
    safe = safe.replace(/<div\s+class="math-block"\s+data-latex="([^"]*)">[\s\S]*?<\/div>/g, (m, latex) => {
      try {
        const decoded = latex.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
        return '<div class="math-block">' + window.katex.renderToString(decoded, { throwOnError: false, displayMode: true }) + '</div>'
      } catch (e) { return '<div class="math-block">' + latex + '</div>' }
    })
  }
  return safe
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// 同步 contenteditable 内容到 noteForm.content
function onNoteEditorInput() {
  if (noteEditorRef.value) {
    noteForm.value.content = noteEditorRef.value.innerHTML
  }
  scheduleAutoSaveNote()
}

// 论文笔记自动保存（防抖 800ms）
function scheduleAutoSaveNote() {
  clearTimeout(noteAutoSaveTimer)
  noteAutoSaveTimer = setTimeout(() => {
    doAutoSaveNote()
  }, 800)
}
function doAutoSaveNote() {
  const title = noteForm.value.title.trim()
  const content = noteForm.value.content || ''
  const hasContent = title || (content && content !== '<br>' && content !== '<p><br></p>' && content.replace(/<[^>]+>/g, '').trim().length > 0)
  if (!hasContent) return
  const payload = {
    title: noteForm.value.title,
    content: content,
    paperId: noteForm.value.paperId,
    folderId: noteForm.value.folderId
  }
  if (editingNoteId.value) {
    paperNotesStore.updateNote(editingNoteId.value, payload)
  } else {
    const newNote = paperNotesStore.addNote(payload)
    if (newNote && newNote.id) {
      editingNoteId.value = newNote.id
    }
  }
  noteLastSavedAt = Date.now()
  noteAutoSaveStatus.value = '已保存于 ' + dayjs().format('HH:mm:ss')
  clearNoteDraft()
}

// 在选区前后插入 HTML 标签（行内）- 用于 contenteditable
function insertHtmlTag(tag, attrs = '') {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  if (tag === 'strong') document.execCommand('bold')
  else if (tag === 'em') document.execCommand('italic')
  else if (tag === 'u') document.execCommand('underline')
  else if (tag === 'del') document.execCommand('strikeThrough')
  else if (tag === 'code') {
    // 行内代码：手动包裹
    const sel = window.getSelection()
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      if (!range.collapsed) {
        const code = document.createElement('code')
        code.textContent = range.toString()
        range.deleteContents()
        range.insertNode(code)
        // 把光标移到 code 后面
        range.setStartAfter(code)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }
  else if (tag === 'a') {
    const sel = window.getSelection()
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const selectedText = range.toString()
      const url = prompt('请输入链接地址：', 'https://')
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.target = '_blank'
        a.textContent = selectedText || url
        range.deleteContents()
        range.insertNode(a)
        range.setStartAfter(a)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }
  onNoteEditorInput()
}

// 在当前行或选区插入成对 HTML 块
function insertHtmlLine(open, close) {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  if (open === '<h1>') document.execCommand('formatBlock', false, 'h1')
  else if (open === '<h2>') document.execCommand('formatBlock', false, 'h2')
  else if (open === '<h3>') document.execCommand('formatBlock', false, 'h3')
  else if (open === '<blockquote>') document.execCommand('formatBlock', false, 'blockquote')
  else if (open.startsWith('<ul>')) document.execCommand('insertUnorderedList')
  else if (open.startsWith('<ol>')) document.execCommand('insertOrderedList')
  onNoteEditorInput()
}

// 在光标处插入 HTML 块
function insertHtmlBlock(block) {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  if (block === '<hr/>') document.execCommand('insertHorizontalRule')
  else if (block === '\t') document.execCommand('insertHTML', false, '&emsp;')
  onNoteEditorInput()
}

// 颜色选择器切换
// 保存 / 恢复编辑器选区
function saveSelection() {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0 && noteEditorRef.value && noteEditorRef.value.contains(sel.anchorNode)) {
    savedSelection.value = sel.getRangeAt(0).cloneRange()
  }
}
function restoreSelection() {
  if (!savedSelection.value) return
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(savedSelection.value)
  noteEditorRef.value?.focus()
}

function toggleColorPicker(type) {
  saveSelection()
  activeColorPicker.value = activeColorPicker.value === type ? null : type
}

// 文字颜色
function applyTextColor(color) {
  restoreSelection()
  currentTextColor.value = color || '#1F2937'
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  if (!color) {
    document.execCommand('removeFormat')
  } else {
    document.execCommand('foreColor', false, color)
  }
  onNoteEditorInput()
}

// 高亮颜色
function applyHighlightColor(color) {
  restoreSelection()
  currentHighlightColor.value = color || 'transparent'
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  if (!color || color === 'transparent') {
    document.execCommand('backColor', false, 'transparent')
  } else {
    document.execCommand('backColor', false, color)
  }
  onNoteEditorInput()
}

// ===== 字号（包裹选中文字为 <span style="font-size:..px">） =====
function applyFontSize() {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    if (range.toString().length > 0) {
      const span = document.createElement('span')
      span.style.fontSize = currentFontSize.value
      try {
        span.appendChild(range.extractContents())
        range.insertNode(span)
        range.setStartAfter(span); range.collapse(true)
        sel.removeAllRanges(); sel.addRange(range)
      } catch (e) { /* 选区跨多节点时放弃 */ }
    } else {
      // 无选区时插入零宽标记，后续输入将应用该字号
      const span = document.createElement('span')
      span.style.fontSize = currentFontSize.value
      span.innerHTML = '&#8203;'
      range.insertNode(span)
      range.setStartAfter(span); range.collapse(true)
      sel.removeAllRanges(); sel.addRange(range)
    }
  }
  onNoteEditorInput()
}

// ===== 对齐（左/居中/右） =====
function applyAlign(cmd) {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  document.execCommand(cmd, false, null)
  activeAlign.value = cmd === 'justifyLeft' ? 'left' : cmd === 'justifyCenter' ? 'center' : 'right'
  onNoteEditorInput()
}

// ===== 特殊符号面板 =====
function toggleSymbolPanel() {
  showSymbolPanel.value = !showSymbolPanel.value
  if (showSymbolPanel.value) {
    showFormulaInput.value = false
    activeColorPicker.value = null
  }
}
function insertSymbol(sym) {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  document.execCommand('insertText', false, sym)
  showSymbolPanel.value = false
  onNoteEditorInput()
}

function execCmd(cmd) {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  document.execCommand(cmd, false, null)
  onNoteEditorInput()
}
// 阻止工具栏按钮抢走 contenteditable 焦点（select 除外）
function preventToolbarFocus(e) {
  if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
    e.preventDefault()
  }
}
// Tab 键插入制表符
function insertTab() {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  document.execCommand('insertHTML', false, '&emsp;')
  onNoteEditorInput()
}
function applyHeadingStyle(tag) {
  if (!tag) return
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  const sel = window.getSelection()
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    const content = range.toString()
    if (content) {
      document.execCommand('insertHTML', false, `<${tag}>${content}</${tag}>`)
    } else {
      document.execCommand('insertHTML', false, `<${tag}>标题</${tag}>`)
    }
  }
  onNoteEditorInput()
}
function insertFormulaWysiwyg(latex) {
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  const html = `<div class="math-block" data-latex="${encodeURIComponent(latex)}">${renderFormula(latex)}</div><p><br></p>`
  document.execCommand('insertHTML', false, html)
  showFormulaInput.value = false
  onNoteEditorInput()
}

// ===== 公式输入（KaTeX 渲染） =====
function toggleFormulaInput() {
  showFormulaInput.value = !showFormulaInput.value
  if (showFormulaInput.value) {
    showSymbolPanel.value = false
    activeColorPicker.value = null
    formulaPreview.value = ''
  }
}
function renderFormula(latex) {
  try {
    if (window.katex) {
      return window.katex.renderToString(latex, { throwOnError: false, displayMode: true })
    }
    return `<code>${latex}</code>`
  } catch (e) {
    return `<code>${latex}</code>`
  }
}
function insertFormula() {
  const latex = formulaLatex.value.trim()
  if (!latex) return
  const html = `<div class="math-block" data-latex="${latex.replace(/"/g, '&quot;')}">${renderFormula(latex)}</div><p><br></p>`
  const el = noteEditorRef.value
  if (!el) return
  el.focus()
  document.execCommand('insertHTML', false, html)
  showFormulaInput.value = false
  formulaLatex.value = ''
  formulaPreview.value = ''
  onNoteEditorInput()
}
watch(formulaLatex, (v) => {
  if (v && v.trim()) formulaPreview.value = renderFormula(v.trim())
  else formulaPreview.value = ''
})

// 笔记详情弹窗
function openNoteDetail(note) {
  detailNote.value = note
  showNoteDetailModal.value = true
}

function closeNoteDetail() {
  showNoteDetailModal.value = false
  detailNote.value = null
}

// ===== 列宽拖拽 =====
const columnWidths = ref({})
let resizingCol = null
let resizeStartX = 0
let resizeStartWidth = 0

// 鼠标滚轮横向滚动表格
function handleTableWheel(e) {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.currentTarget.scrollLeft += e.deltaY
    e.preventDefault()
  }
}

function startResize(e, colKey) {
  resizingCol = colKey
  resizeStartX = e.clientX
  const th = e.target.closest('th')
  resizeStartWidth = th ? th.offsetWidth : 120
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e) {
  if (!resizingCol) return
  const diff = e.clientX - resizeStartX
  const newWidth = Math.max(50, resizeStartWidth + diff)
  columnWidths.value = { ...columnWidths.value, [resizingCol]: newWidth }
}

function onResizeEnd() {
  resizingCol = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

// ===== 自定义排序 - 拖拽行 =====
const dragRow = ref(null)
const dragOverRow = ref(null)

function onDragRowStart(e, paper) {
  if (paperLibraryStore.sortOrder !== 'custom') return
  dragRow.value = paper
  ignoreRowClickUntil = Date.now() + 200
  e.dataTransfer.effectAllowed = 'move'
}

function onDragRowOver(e, paper) {
  if (!dragRow.value || dragRow.value.id === paper.id) return
  e.preventDefault()
  dragOverRow.value = paper
}

function onDragRowDrop(e, paper) {
  e.preventDefault()
  if (!dragRow.value || dragRow.value.id === paper.id) {
    dragRow.value = null
    dragOverRow.value = null
    return
  }
  const papers = [...paperLibraryStore.papers]
  const fromIdx = papers.findIndex(p => p.id === dragRow.value.id)
  const toIdx = papers.findIndex(p => p.id === paper.id)
  if (fromIdx < 0 || toIdx < 0) return
  const [moved] = papers.splice(fromIdx, 1)
  papers.splice(toIdx, 0, moved)
  papers.forEach((p, i) => { p.order = i })
  paperLibraryStore.papers = papers
  save('paperLibrary', papers)
  dragRow.value = null
  dragOverRow.value = null
}

function onDragRowEnd() {
  dragRow.value = null
  dragOverRow.value = null
}

const paperTableRef = ref(null)
</script>

<style scoped>
.paper-center-page { max-width: 100%; padding: 0 4px; }

/* ===== Tab 栏：胶囊样式（对齐计划中心） ===== */
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

/* 论文库头部按钮（简笔画图标 + 文字） */
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

/* 论文库配置弹窗 2x2 网格 */
.config-modal { max-width: 920px; }
.cfg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.cfg-group-title { display: flex; align-items: center; gap: 8px; font-size: 14px; margin: 0 0 10px 0; }
.cfg-group-title svg { color: var(--color-primary); flex-shrink: 0; }

.section-card { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-header-actions { display: flex; gap: 8px; align-items: center; }
.card-title { font-size: 16px; font-weight: 600; }
.text-xs { font-size: 12px; }
.text-tertiary { color: var(--color-text-tertiary); }

/* 总览 */
.overview-grid { display: grid; grid-template-columns: 420px 1fr; gap: 20px; align-items: start; }
.overview-right-col { min-height: 420px; display: flex; flex-direction: column; }
.overview-paper-groups { display: flex; flex-direction: column; gap: 16px; max-height: 420px; overflow-y: auto; padding-right: 4px; }
.chart-wrap { height: 280px; display: flex; align-items: center; justify-content: center; }
.chart-el { width: 100%; height: 100%; }
.chart-legend { display: flex; flex-wrap: wrap; gap: 10px 16px; justify-content: center; margin-top: 8px; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-name { color: var(--color-text-secondary); }
.legend-count { color: var(--color-text-primary); font-weight: 600; }
.status-group-header { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-count { color: var(--color-text-tertiary); font-weight: 500; margin-left: auto; }
.status-paper-list { display: flex; flex-direction: column; gap: 6px; }
.status-paper-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--color-bg); border-radius: var(--radius-md); font-size: 13px; cursor: pointer; transition: background var(--transition-fast); }
.status-paper-item:hover { background: var(--color-bg-hover); }
.paper-title-sm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-primary); }
.paper-meta-sm { flex-shrink: 0; font-size: 11px; color: var(--color-text-tertiary); background: var(--color-bg-hover); padding: 1px 6px; border-radius: var(--radius-full); }

/* 筛选栏 */
.filter-bar { margin-bottom: 12px; padding: 12px; background: var(--color-bg); border-radius: var(--radius-md); }
.filter-search-row { margin-bottom: 8px; }
.filter-search-full { width: 100%; }
.filter-selects-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
.filter-select-col { width: 100%; }
.filter-refresh-btn { flex-shrink: 0; white-space: nowrap; }
.filter-bottom-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-tags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1; }
.filter-tags-label { font-size: 12px; color: var(--color-text-tertiary); flex-shrink: 0; }
.tag-chip { padding: 2px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-full); background: white; font-size: 12px; color: var(--color-text-secondary); cursor: pointer; transition: all var(--transition-fast); }
.tag-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.tag-chip.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.filter-clear { flex-shrink: 0; color: var(--color-text-tertiary); font-size: 12px; }
.filter-stats { font-size: 12px; color: var(--color-text-tertiary); white-space: nowrap; margin-left: auto; }

/* 论文库表格 */
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
  padding: 10px 10px; border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-primary); text-align: center; vertical-align: middle;
}
.paper-row { cursor: pointer; transition: background var(--transition-fast); }
.paper-row:hover td { background: var(--color-bg-hover); }
.paper-table tr:last-child td { border-bottom: none; }

/* 列宽拖拽手柄 */
.col-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 2;
  transition: background var(--transition-fast);
}
.col-resize-handle:hover {
  background: var(--color-primary);
  opacity: 0.4;
}
.paper-table th:hover .col-resize-handle::after {
  content: '';
  position: absolute;
  right: 2px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--color-border);
  border-radius: 1px;
}

.col-seq { width: 50px; }
.col-status { width: 100px; white-space: nowrap; }
.col-title { max-width: 17em; }
.col-authors { min-width: 120px; max-width: 240px; }
.col-year { width: 70px; }
.col-journal { min-width: 140px; max-width: 280px; }
.col-unit { min-width: 130px; max-width: 240px; }
.col-impact { min-width: 130px; max-width: 260px; }
.col-maincontent { min-width: 180px; max-width: 360px; }
.col-innovation { min-width: 160px; max-width: 320px; }
.col-tags { min-width: 120px; max-width: 240px; }
.col-actions { width: 80px; white-space: nowrap; }
.col-custom { min-width: 100px; max-width: 260px; }
.col-title, .col-authors, .col-journal, .col-unit, .col-impact, .col-maincontent, .col-innovation, .col-tags, .col-custom {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* 拖拽排序 */
.drag-row-handle {
  cursor: grab;
  color: var(--color-text-tertiary);
  font-size: 12px;
  margin-right: 4px;
  vertical-align: middle;
  user-select: none;
}
.drag-row-handle:active { cursor: grabbing; }
.paper-row.dragging-row {
  opacity: 0.35;
}
.paper-row.drag-over-row td {
  border-top: 2px solid var(--color-primary) !important;
}

.paper-title-cell { display: inline-block; vertical-align: middle; max-width: 17em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.doi-badge { display: inline-block; margin-left: 4px; padding: 1px 5px; background: #EEF2FF; color: #5B5FEF; border-radius: 3px; font-size: 10px; font-weight: 600; vertical-align: middle; }

/* ===== 论文阅读 ===== */
.reading-sort-hint { font-size: 12px; color: var(--color-text-tertiary); }
.col-reading-title { min-width: 120px; max-width: 17em; }
.col-reading-year { width: 80px; }
.col-reading-researchobject, .col-reading-researchpurpose, .col-reading-researchmethod { min-width: 110px; max-width: 220px; }
.col-reading-innovation, .col-reading-referenceideas { min-width: 140px; max-width: 280px; }
.col-reading-tags { min-width: 100px; max-width: 200px; }
.col-reading-title, .col-reading-researchobject, .col-reading-researchpurpose, .col-reading-researchmethod, .col-reading-innovation, .col-reading-referenceideas, .col-reading-tags {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
[class^="col-reading-custom"] {
  min-width: 100px; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.reading-title-cell { display: inline-block; vertical-align: middle; max-width: 16em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reading-linked-paper {
  margin-top: 16px; padding: 14px; background: var(--color-bg);
  border: 1px dashed var(--color-border); border-radius: var(--radius-md);
  display: flex; flex-direction: column; gap: 10px;
}
.reading-linked-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 600; color: var(--color-primary); margin-bottom: 2px; }
.reading-linked-title { display: inline-flex; align-items: center; gap: 4px; }

/* 状态徽章 */
.status-badge-wrap { position: relative; display: inline-block; }
.status-badge {
  display: inline-block; padding: 3px 12px; border-radius: var(--radius-full);
  font-size: 12px; font-weight: 600; cursor: pointer; border: 1.5px solid;
  transition: all var(--transition-fast); user-select: none;
}
.status-badge:hover { transform: scale(1.05); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.status-popup {
  background: rgba(255, 255, 255, 0.92); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 99999; min-width: 120px; overflow: hidden; position: fixed;
}
.status-popup-item { padding: 7px 14px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; color: var(--color-text-primary); transition: background var(--transition-fast); }
.status-popup-item:hover { background: var(--color-bg-hover); }
.status-popup-item.active { font-weight: 600; color: var(--color-primary); }
.status-popup-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.mini-tag { display: inline-block; padding: 1px 6px; background: var(--color-bg); border-radius: var(--radius-sm); font-size: 11px; color: var(--color-text-tertiary); margin-right: 3px; border: 1px solid transparent; }
.mini-tag-more { font-size: 11px; color: var(--color-text-tertiary); }

/* 影响因子徽章 */
.impact-badges { display: flex; flex-wrap: wrap; gap: 3px; }
.impact-badge { display: inline-block; padding: 1px 6px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 500; white-space: nowrap; }

/* 标签颜色圆点 */
.tag-color-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; cursor: pointer; margin-right: 3px; border: 1px solid rgba(0,0,0,0.1); transition: transform 0.15s; }
.tag-color-dot:hover { transform: scale(1.3); }

.export-dropdown { position: relative; display: inline-block; }
.export-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: rgba(255, 255, 255, 0.92); border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-md); z-index: 10; min-width: 150px; overflow: hidden; }
.export-menu button { display: block; width: 100%; padding: 10px 14px; border: none; background: none; text-align: left; font-size: 13px; cursor: pointer; color: var(--color-text-primary); }
.export-menu button:hover { background: var(--color-bg-hover); }

/* 弹窗表单 */
.form-group { margin-bottom: 0; }
.form-label { display: block; font-size: 12px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 4px; }
.form-row { display: flex; gap: 12px; }
.flex-1 { flex: 1; min-width: 0; }
.required { color: #DC2626; }
.form-hint { font-size: 11px; color: var(--color-text-tertiary); margin-top: 4px; }

.pdf-linked-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--color-bg-secondary, #f5f7fa); border: 1px solid var(--color-border, #e5e7eb); border-radius: var(--radius-md); }
.pdf-linked-name { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-text-secondary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pdf-parse-check { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-text-secondary); cursor: pointer; user-select: none; }

.input-with-btn { display: flex; gap: 8px; align-items: center; }
.doi-btn { flex-shrink: 0; white-space: nowrap; }

.if-badge { display: inline-block; padding: 1px 7px; background: #EEF2FF; color: #5B5FEF; border-radius: var(--radius-sm); font-size: 11px; font-weight: 500; white-space: nowrap; }
.if-badge-top { background: #FEE2E2; color: #DC2626; }

/* 标签输入 */
.tag-input-container { position: relative; }
.tag-input-wrap { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 8px; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); min-height: 38px; align-items: center; background: white; }
.tag-input-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: var(--radius-full); font-size: 12px; border: 1px solid transparent; }
.tag-remove { border: none; background: none; color: #5B5FEF; cursor: pointer; font-size: 14px; line-height: 1; padding: 0; }
.tag-input-field { flex: 1; min-width: 100px; border: none; outline: none; font-size: 13px; padding: 2px 0; }
.tag-input-wrap.has-suggest { border-color: var(--color-primary, #5B5FEF); box-shadow: 0 0 0 2px rgba(91,95,239,0.12); }
.tag-suggest-panel { position: absolute; z-index: 50; left: 0; right: 0; top: calc(100% + 4px); background: #fff; border: 1px solid var(--color-border, #e5e7eb); border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(0,0,0,0.12); padding: 8px; max-height: 220px; overflow-y: auto; }
.tag-suggest-title { font-size: 11px; color: var(--color-text-tertiary); margin-bottom: 6px; padding: 0 2px; }
.tag-suggest-list { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-suggest-item { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: var(--radius-full); font-size: 12px; border: 1px solid; cursor: pointer; background: none; transition: filter 0.15s; }
.tag-suggest-item:hover { filter: brightness(0.94); }
.tag-suggest-create { display: flex; align-items: center; gap: 4px; width: 100%; margin-top: 8px; padding: 6px 10px; border: 1px dashed var(--color-primary, #5B5FEF); border-radius: var(--radius-md); font-size: 12px; color: var(--color-primary, #5B5FEF); background: none; cursor: pointer; }
.tag-suggest-create:hover { background: rgba(91,95,239,0.06); }

.empty-state { text-align: center; color: var(--color-text-tertiary); font-size: 14px; }
.empty-state-icon { font-size: 40px; margin-bottom: 8px; }

/* 总览笔记预览（独立整行卡片） */
.overview-notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.overview-note-card { padding: 14px 16px; background: var(--color-bg); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); border: 1px solid transparent; }
.overview-note-card:hover { background: var(--color-primary-bg); border-color: var(--color-primary); }
.overview-note-card-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 6px; display: block; }
.overview-note-card-preview { font-size: 12px; color: var(--color-text-tertiary); display: block; margin-bottom: 8px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.overview-note-card-time { font-size: 11px; color: var(--color-text-light); }

/* 笔记布局 v2：左侧树状 + 中间导航 + 右侧编辑器 + 最右设置 */
.notes-layout-v2 { display: grid; grid-template-columns: 240px 180px 1fr; gap: 12px; min-height: calc(100vh - 200px); }
.notes-layout-v2.has-right-panel { grid-template-columns: 240px 180px 1fr 240px; }
.notes-tree-panel { padding: 12px; display: flex; flex-direction: column; max-height: calc(100vh - 180px); overflow: hidden; }
.notes-editor-panel-v2 { padding: 16px; display: flex; flex-direction: column; max-height: calc(100vh - 180px); }
.notes-outline-panel { padding: 12px; display: flex; flex-direction: column; max-height: calc(100vh - 180px); overflow: hidden; }
.note-settings-panel { padding: 12px; display: flex; flex-direction: column; max-height: calc(100vh - 180px); overflow: hidden; }

/* 树状结构 */
.notes-tree { flex: 1; overflow-y: auto; overflow-x: hidden; }
.tree-folder { margin-bottom: 2px; }
.tree-folder.active > .tree-folder-header { background: var(--color-primary-bg); border-radius: var(--radius-sm); }
.tree-folder-header { display: flex; align-items: center; gap: 4px; padding: 5px 6px; cursor: pointer; font-size: 13px; border-radius: var(--radius-sm); transition: background 0.15s; }
.tree-folder-header:hover { background: var(--color-bg-hover); }
.tree-folder-dragover { background: var(--color-primary-bg) !important; outline: 2px dashed var(--color-primary); }
.tree-arrow { font-size: 10px; width: 16px; text-align: center; transition: transform 0.15s; flex-shrink: 0; color: var(--color-text-tertiary); }
.tree-arrow.expanded { transform: rotate(90deg); }
.tree-count { font-size: 10px; color: var(--color-text-tertiary); margin-left: auto; background: var(--color-bg); padding: 1px 6px; border-radius: 8px; }
.tree-action-btn { border: none; background: transparent; color: var(--color-text-tertiary); font-size: 11px; cursor: pointer; padding: 2px 3px; border-radius: 3px; opacity: 0; transition: opacity 0.15s; }
.tree-folder-header:hover .tree-action-btn { opacity: 0.7; }
.tree-action-btn:hover { opacity: 1 !important; background: var(--color-bg-hover); }
.tree-add-btn { border: 1.5px dashed var(--color-border); background: transparent; border-radius: 6px; cursor: pointer; color: var(--color-text-tertiary); padding: 4px 7px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.tree-add-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-bg); }
.tree-add-btn svg { display: block; }
.tree-sub { padding-left: 18px; }
.tree-sub-folder { margin-bottom: 1px; }
.tree-sub-folder .tree-folder-header { font-size: 12px; }
.tree-rename-input { flex: 1; font-size: 12px; padding: 2px 6px; border: 1px solid var(--color-primary); border-radius: var(--radius-sm); outline: none; background: white; }

/* 树中笔记项 */
.tree-notes-section { padding-top: 6px; border-top: 1px solid var(--color-border-light); margin-top: 4px; }
.tree-note-item { display: flex; align-items: center; gap: 4px; padding: 4px 6px; cursor: pointer; font-size: 12px; border-radius: var(--radius-sm); transition: background 0.15s; }
.tree-note-item:hover { background: var(--color-bg-hover); }
.tree-note-item.active { background: var(--color-primary-bg); font-weight: 600; }
.tree-note-icon { flex-shrink: 0; font-size: 12px; }
.tree-note-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-primary); }
.tree-note-time { font-size: 10px; color: var(--color-text-tertiary); flex-shrink: 0; }
.tree-note-item .tree-action-btn { opacity: 0; }
.tree-note-item:hover .tree-action-btn { opacity: 0.7; }
.tree-empty { padding: 16px; text-align: center; font-size: 12px; color: var(--color-text-tertiary); }

/* 编辑器 v2 */
.note-editor-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.note-editor-header .header-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.note-editor-header .note-title-input { font-size: 16px; font-weight: 600; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); padding: 8px 12px; flex: 1; min-width: 0; }
.note-editor-header .note-title-input:focus { border-color: var(--color-primary); outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
.note-editor-footer { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; margin-top: 8px; }
.zoom-control { display: flex; align-items: center; gap: 4px; }

/* 导航大纲 */
.outline-list { flex: 1; overflow-y: auto; padding-right: 4px; }
.outline-item { padding: 5px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.12s; }
.outline-item:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.outline-item.level-1 { font-weight: 600; color: var(--color-text-primary); }
.outline-item.level-2 { padding-left: 18px; }
.outline-item.level-3 { padding-left: 30px; }
.outline-item.level-4 { padding-left: 42px; font-size: 11px; }
.outline-item.level-5 { padding-left: 54px; font-size: 11px; }
.outline-item.level-6 { padding-left: 66px; font-size: 11px; }
.outline-empty { padding: 16px 8px; text-align: center; font-size: 12px; color: var(--color-text-tertiary); line-height: 1.5; }

/* 附加设置面板 */
.settings-panel-body { flex: 1; overflow-y: auto; padding-right: 4px; }
.formula-input-section { display: flex; flex-direction: column; }

/* 旧标题输入保留兼容 */
.note-title-input { font-size: 16px; font-weight: 600; border: none; border-bottom: 1px solid var(--color-border-light); border-radius: 0; padding: 8px 4px; flex: 1; }
.note-title-input:focus { border-bottom-color: var(--color-primary); outline: none; }

/* 笔记工具栏与元信息一行 */
.note-editor-toolbar-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 10px; background: #f8f9fa; border: 1px solid var(--color-border-light); border-radius: var(--radius-md); margin-bottom: 10px; }
.note-meta-selects { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.note-meta-select { max-width: 180px; font-size: 12px; padding: 5px 8px; border-radius: var(--radius-sm); background: white; }

/* Word 风格工具栏 */
.word-toolbar-v2 { display: flex; align-items: center; gap: 1px; flex: 1; min-width: 0; }
.wt-group { display: flex; align-items: center; gap: 1px; padding: 0 6px; border-right: 1px solid #d1d5db; }
.wt-group-last { border-right: none; }
.wt-btn { display: flex; align-items: center; justify-content: center; gap: 1px; min-width: 28px; height: 28px; padding: 4px 6px; border: 1px solid #d1d5db; background: #ffffff; border-radius: 3px; color: var(--color-text-secondary); cursor: pointer; transition: all 0.12s; }
.wt-btn:hover { background: #f3f4f6; border-color: #9ca3af; color: var(--color-text-primary); }
.wt-btn:active { background: #e5e7eb; }
.wt-btn svg { display: block; }
.wt-btn-label { font-size: 11px; font-weight: 700; min-width: 26px; padding: 4px 5px; }
.wt-btn-color { position: relative; flex-direction: column; padding: 3px 5px; height: 30px; min-width: 30px; }
.wt-color-a { font-size: 13px; font-weight: 700; line-height: 1; color: var(--color-text-primary); }
.wt-color-bar { display: block; width: 16px; height: 3px; border-radius: 1px; margin-top: 1px; }

/* Office 风格颜色面板 */
.wt-color-wrap { position: relative; }
.office-color-panel { position: absolute; top: calc(100% + 4px); left: 0; z-index: 200; width: 232px; background: #ffffff; border: 1px solid #d1d5db; border-radius: var(--radius-md); padding: 10px 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.14); }
.ocp-section { margin-bottom: 10px; }
.ocp-section:last-child { margin-bottom: 0; }
.ocp-section-title { font-size: 11px; color: var(--color-text-secondary); margin-bottom: 6px; }
.ocp-auto { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--color-text-primary); transition: background 0.12s; }
.ocp-auto:hover { background: var(--color-bg-hover); }
.ocp-auto-a { font-size: 15px; font-weight: 700; }
.ocp-none-box { width: 18px; height: 18px; border: 1px solid; border-radius: 2px; position: relative; }
.ocp-none-box::after { content: ''; position: absolute; left: 50%; top: -2px; bottom: -2px; width: 1px; background: var(--color-danger); transform: rotate(45deg); }
.ocp-theme-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; }
.ocp-standard-row { display: grid; grid-template-columns: repeat(10, 1fr); gap: 3px; }
.ocp-swatch { aspect-ratio: 1; border-radius: 2px; cursor: pointer; border: 1px solid rgba(0,0,0,0.06); transition: transform 0.1s; }
.ocp-swatch:hover { transform: scale(1.15); z-index: 1; border-color: rgba(0,0,0,0.25); }
.ocp-footer { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border-light); }
.ocp-more { position: relative; display: block; padding: 5px 6px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--color-text-primary); transition: background 0.12s; }
.ocp-more:hover { background: var(--color-bg-hover); }

/* 编辑器主体 v2 */
.note-editor-body-v2 { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.note-editor-contenteditable { flex: 1; min-height: 320px; padding: 12px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 13px; line-height: 1.7; outline: none; overflow-y: auto; overflow-x: visible; background: white; }
.note-editor-contenteditable:focus { border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
.note-editor-contenteditable:empty:before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; }
.note-editor-contenteditable h1 { font-size: 20px; margin: 6px 0; }
.note-editor-contenteditable h2 { font-size: 17px; margin: 5px 0; }
.note-editor-contenteditable h3 { font-size: 15px; margin: 4px 0; }
.note-editor-contenteditable strong, .note-editor-contenteditable b { font-weight: 600; }
.note-editor-contenteditable em, .note-editor-contenteditable i { font-style: italic; }
.note-editor-contenteditable u { text-decoration: underline; text-underline-offset: 2px; }
.note-editor-contenteditable del, .note-editor-contenteditable s { text-decoration: line-through; }
.note-editor-contenteditable code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 12px; font-family: 'Consolas', 'Courier New', monospace; }
.note-editor-contenteditable blockquote { border-left: 3px solid var(--color-primary); padding-left: 10px; color: var(--color-text-secondary); margin: 6px 0; }
/* 列表：增加左缩进并防止 marker 被遮挡 */
.note-editor-contenteditable ul, .note-editor-contenteditable ol { padding-left: 32px; margin: 4px 0; list-style-position: outside; }
.note-editor-contenteditable ul { list-style-type: disc; }
.note-editor-contenteditable ul ul { list-style-type: circle; }
.note-editor-contenteditable ul ul ul { list-style-type: square; }
.note-editor-contenteditable li { padding-left: 4px; margin: 2px 0; }
.note-editor-contenteditable hr { border: none; border-top: 1px solid var(--color-border-light); margin: 10px 0; }
.note-editor-contenteditable a { color: var(--color-primary); text-decoration: underline; }
.note-editor-contenteditable pre { background: #f1f5f9; padding: 10px; border-radius: var(--radius-sm); overflow-x: auto; font-size: 12px; font-family: 'Consolas', monospace; }

/* 详情弹窗 HTML 预览 */
.note-html-preview { font-size: 14px; line-height: 1.7; }
.note-html-preview h1 { font-size: 18px; margin: 8px 0; }
.note-html-preview h2 { font-size: 16px; margin: 8px 0; }
.note-html-preview h3 { font-size: 14px; margin: 6px 0; }
.note-html-preview strong, .note-html-preview b { font-weight: 600; }
.note-html-preview em, .note-html-preview i { font-style: italic; }
.note-html-preview u { text-decoration: underline; text-underline-offset: 2px; }
.note-html-preview del, .note-html-preview s { text-decoration: line-through; }
.note-html-preview code { background: var(--color-bg); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.note-html-preview blockquote { border-left: 3px solid var(--color-primary); padding-left: 10px; color: var(--color-text-secondary); margin: 6px 0; }
.note-html-preview ul, .note-html-preview ol { padding-left: 28px; margin: 6px 0; list-style-position: outside; }
.note-html-preview ul li, .note-html-preview ol li { padding-left: 4px; }
.note-html-preview hr { border: none; border-top: 1px solid var(--color-border-light); margin: 8px 0; }
.note-html-preview a { color: var(--color-primary); text-decoration: underline; }

/* 详情弹窗 */
.detail-content { display: flex; flex-direction: column; gap: 12px; }
.detail-field { margin-bottom: 0; }
.detail-row { display: flex; gap: 16px; }
.detail-label { display: block; font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); margin-bottom: 4px; text-transform: uppercase; }
.detail-value { font-size: 14px; color: var(--color-text-primary); line-height: 1.5; word-break: break-word; overflow-wrap: break-word; }
.detail-title { font-size: 16px; font-weight: 600; word-break: break-word; overflow-wrap: break-word; }
.detail-textarea { display: block; background: var(--color-bg); padding: 10px 12px; border-radius: var(--radius-md); font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; max-width: 100%; box-sizing: border-box; }

/* 字号选择器 */
.wt-btn-select { padding: 4px 8px; font-size: 12px; cursor: pointer; min-width: 70px; }

/* 笔记自动保存状态 */
.note-autosave-status {
  font-size: 12px;
  color: var(--color-text-tertiary);
  transition: color 0.2s;
}
.note-autosave-status.is-active {
  color: var(--color-success);
}
.wt-btn-active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

/* 符号面板 */
.symbol-panel { position: absolute; top: calc(100% + 4px); left: 0; z-index: 200; width: 280px; background: #fff; border: 1px solid #d1d5db; border-radius: var(--radius-md); padding: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.14); max-height: 320px; overflow-y: auto; }
.symbol-group { margin-bottom: 10px; }
.symbol-group:last-child { margin-bottom: 0; }
.symbol-group-title { font-size: 11px; color: var(--color-text-secondary); margin-bottom: 5px; font-weight: 500; }
.symbol-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
.symbol-btn { width: 28px; height: 28px; border: 1px solid transparent; background: transparent; border-radius: var(--radius-sm); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.1s; }
.symbol-btn:hover { background: var(--color-bg-hover); border-color: var(--color-border-light); }

/* 公式输入面板 */
.formula-input-panel { position: absolute; top: calc(100% + 4px); right: 0; z-index: 200; width: 380px; background: #fff; border: 1px solid #d1d5db; border-radius: var(--radius-md); padding: 10px 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.14); }
.formula-preview-box { margin-top: 10px; padding: 10px; background: var(--color-bg); border-radius: var(--radius-sm); min-height: 30px; overflow-x: auto; border: 1px solid var(--color-border-light); }

/* 笔记中的数学公式块 */
.note-editor-contenteditable .math-block,
.note-html-preview .math-block { margin: 10px 0; padding: 8px 0; overflow-x: auto; text-align: center; }
.note-html-preview .math-block { background: var(--color-bg); border-radius: var(--radius-sm); padding: 10px; }

/* ===== 公式弹窗 ===== */
.formula-modal-overlay { position: fixed; inset: 0; z-index: 5000; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; }
.formula-modal { background: #fff; border-radius: var(--radius-lg); box-shadow: 0 20px 60px rgba(0,0,0,0.25); width: 720px; max-width: 94vw; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
.formula-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--color-border-light); flex-shrink: 0; }
.formula-modal-title { font-size: 15px; font-weight: 600; margin: 0; }
.formula-modal-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }
.formula-modal-left { width: 280px; min-width: 280px; border-right: 1px solid var(--color-border-light); overflow-y: auto; padding: 12px 14px; background: #fafafa; flex-shrink: 0; }
.formula-modal-right { flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 14px 18px; overflow-y: auto; }

/* WYSIWYG 公式面板 */
.fw-section { margin-bottom: 14px; }
.fw-section:last-child { margin-bottom: 0; }
.fw-section-title { font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 8px; }
.fw-symbol-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.fw-symbol-btn { display: flex; align-items: center; justify-content: center; height: 30px; padding: 0; border: 1px solid #d1d5db; background: #fff; border-radius: 3px; font-size: 15px; cursor: pointer; transition: all .12s; color: var(--color-text-primary); }
.fw-symbol-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
.fw-structure-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.fw-structure-btn { display: flex; align-items: center; justify-content: center; height: 42px; padding: 4px; border: 1px solid #d1d5db; background: #fff; border-radius: 4px; cursor: pointer; transition: all .12s; }
.fw-structure-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
.fw-structure-preview { font-size: 16px; line-height: 1; color: var(--color-text-primary); }

/* ===== A4 编辑区 =====
   注意：a4-wrapper 不能使用 align-items:center —— flex 居中 + overflow:auto 时，
   子项顶部溢出会被裁剪且无法滚动到（这正是「100% 显示时 A4 上半部分不显示」的根因）。
   改用子项 margin:auto 实现双向居中，溢出时可正常滚动。 */
.a4-wrapper { display: flex; flex-direction: row; justify-content: center; align-items: flex-start; overflow: auto; padding: 16px; background: #f3f4f6; border-radius: var(--radius-md); }
.a4-page { width: 210mm; min-height: 297mm; background: white; padding: 25mm 20mm; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border-radius: 2px; box-sizing: border-box; margin: auto; }
.a4-page .note-editor-contenteditable { border: none !important; box-shadow: none !important; padding: 0 !important; min-height: calc(297mm - 50mm); overflow: visible !important; }

/* ===== 大纲面板精调 ===== */
.outline-panel-header { display: flex; align-items: center; justify-content: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--color-border-light); margin-bottom: 8px; }
.outline-panel-header h3 { font-size: 13px; font-weight: 600; margin: 0; }
.outline-list { flex: 1; overflow-y: auto; padding-right: 4px; }
.outline-item { padding: 5px 8px; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--color-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.12s; text-align: left; }
.outline-item:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.outline-item.level-1 { font-weight: 600; color: var(--color-text-primary); }
.outline-item.level-2 { padding-left: 18px; }
.outline-item.level-3 { padding-left: 30px; }
.outline-item.level-4 { padding-left: 42px; font-size: 11px; }
.outline-item.level-5 { padding-left: 54px; font-size: 11px; }
.outline-empty { padding: 16px 8px; text-align: center; font-size: 12px; color: var(--color-text-tertiary); line-height: 1.5; }

/* ===== 响应式：桌面多列 → 平板减列 → 手机单列 ===== */
@media (max-width: 1100px) {
  .overview-grid { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .filter-selects-row { grid-template-columns: 1fr 1fr; }
  .cfg-grid { grid-template-columns: 1fr; }
  .notes-layout-v2,
  .notes-layout-v2.has-right-panel { grid-template-columns: 1fr; min-height: auto; }
  .notes-layout-v2 .note-editor-contenteditable { min-height: 60vh; }
}
@media (max-width: 560px) {
  .filter-selects-row { grid-template-columns: 1fr; }
}
</style>
