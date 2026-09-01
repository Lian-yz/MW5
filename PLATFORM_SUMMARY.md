# 硕士研究生工作管理平台 — 完整架构与代码说明

> 版本：v5.0.141 | 构建于 2026-08-11 | 共 ~19,600 行代码

---

## 一、平台定位

纯前端单页应用（SPA），面向硕士研究生的全维度个人成长管理工具。零后端、零数据库，所有数据存储在用户本机（localStorage + 可选 File System Access API 文件夹），不上传云端。

**核心设计原则：**
- **本地优先、零后端** — 隐私可控、断网可用
- **配置驱动** — 计划状态/优先级/分类/文献字段等均可自定义
- **渐进兼容** — 任何数据结构变更都做向后兼容，不丢老数据

**技术栈：** Vue 3 + Vite 5 + Pinia 2 + Vue Router 4 + ECharts 5 + dayjs + KaTeX

---

## 二、项目结构总览

```
硕士工作台/
├── index.html                     # SPA 入口
├── package.json                   # 依赖 (vue3/vite5/pinia2/echarts5/dayjs/katex)
├── vite.config.js                 # 构建配置：端口 5173
├── public/
│   ├── favicon.svg
│   └── hean-logo.png
└── src/
    ├── main.js                    # 入口：挂载 Vue/Pinia/Router
    ├── App.vue                    # 顶层布局 & 全局逻辑 (3361 行，核心巨石文件)
    ├── router/index.js            # 路由表 (72 行，hash 模式)
    ├── stores/index.js            # 全部 Pinia Store (2003 行，唯一状态源)
    ├── styles/global.css          # CSS 变量、全局样式 (708 行)
    ├── utils/
    │   ├── storage.js             # localStorage 封装 (load/save/saveSync)
    │   ├── fileStorage.js         # File System Access API (624 行)
    │   ├── paperPdfStorage.js     # 论文 PDF 读写
    │   └── autoExport.js          # 自动导出中间件
    ├── composables/
    │   ├── useModalClose.js       # 弹窗关闭策略
    │   └── useScreenSize.js       # 屏幕尺寸
    ├── components/
    │   ├── common/ColorPresetPicker.vue
    │   ├── layout/MorningPopup.vue
    │   ├── pdf/PdfReader.vue
    │   └── plan/PlanCalendar.vue
    └── views/                     # 页面组件 (共 12 个)
        ├── Login.vue              (221 行)
        ├── Dashboard.vue          (1174 行) — 主页：待办/周计划/专注/闪念
        ├── Research.vue           (1152 行) — 科研中心：组会/实验/灵感/里程碑/研究助手
        ├── PaperCenter.vue        (3211 行) — 论文中心：文献库/PDF/笔记/公式
        ├── Simulation.vue         (858 行)  — 仿真中心：总览/仿真库/仿真记录
        ├── Plan.vue               (1302 行) — 计划中心：日/周/月/季计划与复盘
        ├── CalendarView.vue       (479 行)  — 日历视图
        ├── Navigation.vue         (548 行)  — 科研导航
        ├── PointsCenter.vue       (393 行)  — 积分激励
        ├── Profile.vue            (149 行)  — 个人信息
        ├── Settings.vue           (2364 行) — 平台设置（数据/配置/主题）
        └── SubscriptionCenter.vue (356 行)  — 订阅中心
```

---

## 三、路由与模块清单

| 路径 | 模块 | 图标 | 说明 |
|---|---|---|---|
| `/login` | 登录页 | — | 本地固定账号 |
| `/` | 主页面 | home | 今日待办、周计划、专注计时、闪念 |
| `/research` | 科研中心 | beaker | 组会纪要、实验记录、灵感墙、里程碑、研究助手 |
| `/simulation` | 仿真中心 | cpu | 仿真总览 + 仿真库（初始信息 + 多条仿真记录） |
| `/papers` | 论文中心 | book-open | 文献库、PDF 阅读、笔记、公式 |
| `/plan` | 计划中心 | calendar | 日/周/月/季计划、复盘、子任务 |
| `/calendar` | 日历视图 | calendar | 月/年/周/双周视图 |
| `/navigation` | 科研导航 | compass | 常用学术站点分类导航 |
| `/points` | 积分激励 | award | 积分获取/消费/任务赌注 |
| `/profile` | 个人信息 | user | 个人资料、头像、学业进度 |
| `/settings` | 平台设置 | settings | 数据资产、主题、备份、配置 |

---

## 四、Pinia Store 一览

| Store | 键 | localStorage 键位 |
|---|---|---|
| useSettingsStore | settings | mw_profile, mw_config, mw_theme, mw_appVersion, mw_changelog, mw_navOrder 等 |
| usePlanStore | plan | mw_plans, mw_reviews, mw_planNextSeq |
| useResearchStore | research | mw_meetings, mw_experiments, mw_inspirations, mw_milestones |
| usePaperLibraryStore | paperLibrary | mw_paperLibrary, mw_paperLibraryColumns, mw_paperLibraryStatuses 等 |
| useSimulationStore | simulation | mw_simulations, mw_simNextSeq, mw_simCustomSoftware |
| useTasksStore | tasks | mw_tasks, mw_taskCategories |
| usePointsStore | points | mw_totalPoints, mw_transactions, mw_dailyBet |
| useTimerStore | timer | mw_todayFocusSeconds, mw_weekFocusSeconds, mw_streakDays 等 |
| useNavigationStore | navigation | mw_navSites, mw_navCategories |
| useMessageStore | message | mw_messages |
| useLogStore | log | mw_operationLogs |
| usePaperNotesStore | paperNotes | mw_paperNotes, mw_paperNoteFolders |

---

## 五、仿真中心数据模型（v5.0.140 重构）

仿真对象（Simulation）分为两层：

**顶层 — 初始信息（编辑时仅修改这些字段）：**
```
id, seq, code, subject, startTime, status, linkedPlanId, notes
```

**底层 — 仿真记录数组（records[]，每次实验一条）：**
```
每条 record = { id, software, detail, recordTime, result, fileLocation }
```

**表格展示规则：** 表格中属于 records 的字段（detail/software/recordTime/result/fileLocation）始终取自最新一条 record。

---

## 六、数据存储机制

1. **localStorage** — 默认存储层，所有数据通过 `utils/storage.js` 读写
2. **File System Access API** — 可选本地文件夹持久化，结构：
   ```
   ~/硕士工作台数据/
   ├── meta.json
   ├── data/         # 按模块拆分的 JSON
   └── backups/      # 自动备份 (每 30s, 保留最近 20 个)
   ```
3. **JSON 导出/导入** — 在设置中手动操作
4. **自动备份** — 每 30 秒自动备份到本地文件夹

---

## 七、本地开发

```bash
cd 硕士工作台/
npm install        # 安装依赖
npm run dev        # 开发服务器 (localhost:5173)
npm run build      # 构建生产版本到 dist/
npm run preview    # 预览构建产物
```

**构建产物：** `dist/` 目录，纯静态文件，可部署到任何静态托管服务。

---

## 八、新增页面的步骤

1. `src/views/` 中创建 `Xxx.vue`
2. `router/index.js` 追加路由（含 meta.title 和 meta.icon）
3. `App.vue` 的 `icons` 对象中补充 SVG 图标
4. `settingsStore.navOrder` 默认值中加入新路径
5. `App.vue` 的 `currentRouteTip` 中补帮助文案

---

## 九、关键版本记录（最近）

| 版本 | 变更 |
|---|---|
| v5.0.141 | 仿真记录卡片 UI 重构：扁平化头部单行、取消折叠、去左边栏 |
| v5.0.140 | 删除导师应答模块；仿真数据模型重构（初始信息 + records） |
| v5.0.139 | 仿真库列设置扩展为 11 字段全可选 |
| v5.0.138 | 修复列设置按钮点击无反应 |
| v5.0.137 | 编辑仿真时核心字段保留/其余重置；列设置功能 |
| v5.0.136 | 修复模板弹窗标题栏贴边 |
| v5.0.135 | 修复模板弹窗底部按钮遮挡 |

---

*Copyright © 2026 惟创科技 All Rights Reserved*
