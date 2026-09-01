<template>
  <div class="settings-page">
    <div class="page-title-row">
      <h1 class="page-heading">平台设置</h1>
    </div>
    <!-- 顶部保存栏 -->
    <div class="save-bar" :class="{ dirty: hasChanges }">
      <span v-if="hasChanges" class="save-hint"><AppIcon name="alert-triangle" />  有未保存的修改</span>
      <span v-else class="save-hint">所有设置已保存</span>
      <button class="btn btn-primary" :disabled="!hasChanges" @click="saveAll"><AppIcon name="save" />  保存所有更改</button>
    </div>

    <!-- 左右布局：数据管理（左） + 偏好设置 / API 配置（右） -->
    <div class="settings-layout">
      <!-- 左列：数据管理 -->
      <div class="settings-col settings-col-left">
      <!-- 数据管理 -->
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title">数据管理</h2>
        </div>
        <p class="form-hint">
          <AppIcon name="save" />  数据存储在本地硬盘文件夹中，不上传任何服务器。<br/>
          <AppIcon name="refresh-cw" />  以下列出当前本地文件夹中的所有数据文件及论文 PDF 文件。
        </p>

      <!-- 本地存储文件夹 -->
      <div class="auto-export-row">
        <div class="auto-export-info">
          <span class="auto-export-label"><AppIcon name="folder" />  本地存储文件夹</span>
          <span class="auto-export-desc">
            <template v-if="fileStorageActive">
              <AppIcon name="check-circle" />  已绑定文件夹：<code>{{ fileStorageFolder }}</code>
              <span style="color:var(--color-success);margin-left:8px;">（数据直接存储在本地硬盘）</span>
            </template>
            <template v-else-if="folderHandleExists">
              <AppIcon name="alert-triangle" />  已绑定文件夹：<code>{{ fileStorageFolder }}</code>
              <span style="color:#d97706;">（权限已过期，需要重新授权）</span>
            </template>
            <template v-else>
              选择本地文件夹，数据将直接存储在硬盘中（不依赖浏览器 localStorage）。
              <span style="color:var(--color-warning);">需要 Chrome/Edge 浏览器。</span>
            </template>
          </span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button v-if="folderHandleExists && !fileStorageActive" class="btn btn-sm btn-warning" @click="regrantFolderAccess"><AppIcon name="unlock" />  恢复访问</button>
          <button v-if="!folderHandleExists" class="btn btn-sm btn-primary" @click="selectFolder"><AppIcon name="folder-open" />  选择文件夹</button>
          <button v-if="fileStorageActive" class="btn btn-sm btn-secondary" @click="changeFolder"><AppIcon name="folder-open" />  更换文件夹</button>
          <button v-if="fileStorageActive" class="btn btn-sm btn-secondary" @click="refreshFileList"><AppIcon name="refresh-cw" />  刷新</button>
          <button v-if="folderHandleExists" class="btn btn-sm btn-ghost" @click="unbindFolder">取消绑定</button>
        </div>
      </div>

      <!-- 论文 PDF 存放位置 -->
      <div class="auto-export-row" style="margin-top:12px; background:#f0fdf4; border-color:#bbf7d0;">
        <div class="auto-export-info">
          <span class="auto-export-label"><AppIcon name="file-text" />  论文 PDF 存放位置</span>
          <span class="auto-export-desc">
            <template v-if="pdfDirActive">
              <AppIcon name="check-circle" />  已绑定文件夹：<code>{{ pdfDirName }}</code>
            </template>
            <template v-else-if="pdfDirNeedsRegrant">
              <AppIcon name="alert-triangle" />  权限已过期，需要重新授权
            </template>
            <template v-else>
              选择文件夹存放上传的论文 PDF，在论文列表中可直接打开。未配置时将自动存入浏览器本地数据库（IndexedDB），同样可一键打开。
            </template>
          </span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button v-if="pdfDirActive" class="btn btn-sm btn-secondary" @click="changePdfDir"><AppIcon name="folder-open" />  更换</button>
          <button v-if="pdfDirActive" class="btn btn-sm btn-ghost" @click="unbindPdfDir">取消</button>
          <button v-if="pdfDirNeedsRegrant" class="btn btn-sm btn-warning" @click="regrantPdfDir"><AppIcon name="unlock" />  恢复</button>
          <button v-if="!pdfDirActive && !pdfDirNeedsRegrant" class="btn btn-sm btn-primary" @click="selectPdfDir"><AppIcon name="folder-open" />  选择文件夹</button>
        </div>
      </div>

      <!-- 本地文件夹文件列表 -->
      <div v-if="fileStorageActive" class="file-list-section">
        <h3 class="subsection-title"><AppIcon name="file-text" />  本地文件夹文件列表</h3>
        <p class="form-hint" v-if="folderFiles.length === 0">正在加载或文件夹中暂无数据文件...</p>
        <div v-else class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>类型</th>
                <th>数据键</th>
                <th>大小</th>
                <th>主要作用</th>
                <th>修改时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in folderFiles" :key="f.name">
                <td><code>{{ f.name }}</code></td>
                <td>{{ f.type }}</td>
                <td><span class="file-key">{{ f.key }}</span></td>
                <td>{{ formatSize(f.size) }}</td>
                <td><span class="file-purpose">{{ getFilePurpose(f) }}</span></td>
                <td>{{ formatFileTime(f.lastModified) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="form-hint" style="margin-top: 6px;">
          <AppIcon name="bar-chart" />  共 {{ folderFiles.length }} 个数据文件，总计 {{ formatSize(totalFileSize) }}
        </p>
      </div>

      <!-- 导出 / 导入 / 清除 -->
      <div class="data-actions">
        <button class="btn btn-primary" @click="exportData"><AppIcon name="download" />  导出 JSON</button>
        <button class="btn btn-secondary" @click="triggerImport"><AppIcon name="upload" />  导入 JSON</button>
        <button class="btn btn-danger" @click="showClearConfirm = true"><AppIcon name="trash" />  清除所有数据</button>
      </div>
      <p class="form-hint" style="margin-top: 6px; margin-bottom: 0;">
        <AppIcon name="alert-triangle" />  清除所有数据将同时删除本地文件夹和 localStorage 中的所有 <code>mw_*</code> 数据，操作不可恢复，建议先导出备份。
      </p>

      <!-- 备份与回退（合并原"版本回滚"与"自动备份"） -->
      <div style="margin-top: 16px; padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md);">
        <div class="auto-export-row" style="margin-bottom: 0; flex-wrap: wrap; gap: 8px;">
          <div class="auto-export-info" style="flex: 1; min-width: 180px;">
            <span class="auto-export-label"><AppIcon name="refresh-cw" />  备份与回退</span>
            <span class="auto-export-desc">
              {{ autoBackupStatusText }}
            </span>
          </div>
          <div class="backup-toggle-row" style="display:flex; align-items:center; gap:6px; flex-wrap: nowrap;">
            <label class="toggle-switch" style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px; color:var(--color-text-secondary); flex-shrink:0;">
              <input type="checkbox" :checked="autoBackupEnabled" @change="toggleAutoBackup" />
              <span>{{ autoBackupEnabled ? '开启' : '关闭' }}</span>
            </label>
            <button v-if="fileStorageActive" class="btn btn-sm btn-primary" style="flex-shrink:0;" @click="doManualBackup" :disabled="restoringBackup"><AppIcon name="save" />  立即备份</button>
            <button v-if="fileStorageActive" class="btn btn-sm btn-secondary" style="flex-shrink:0;" @click="loadBackupFiles"><AppIcon name="refresh-cw" />  刷新列表</button>
            <button v-if="backupNeedsRegrant && !backupActive" class="btn btn-sm btn-warning" style="flex-shrink:0;" @click="regrantBackupAccess"><AppIcon name="unlock" />  恢复旧备份权限</button>
          </div>
        </div>

        <!-- 文件夹备份列表 -->
        <div v-if="fileStorageActive" style="margin-top: 10px;">
          <h3 class="subsection-title" style="font-size:14px;"><AppIcon name="folder" />  文件夹备份（可一键回退）</h3>
          <p class="form-hint" v-if="backupFiles.length === 0" style="margin-bottom:0;">暂无备份文件。每次数据修改后会自动生成备份。</p>
          <div v-else style="display:flex; flex-direction:column; gap:6px; max-height: 280px; overflow-y:auto;">
            <div v-for="f in backupFiles" :key="f.name" style="display:flex; align-items:center; gap:10px; padding:8px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
              <div style="flex:1; min-width:0;">
                <div style="font-weight:500; font-size:13px; display:flex; align-items:center; gap:6px;">
                  <span>{{ backupKindLabel(f.kind) }}</span>
                  <span style="font-size:11px; color:var(--color-text-tertiary);">{{ formatSize(f.size) }}</span>
                </div>
                <div class="form-hint" style="margin:0; font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ f.name }}</div>
                <div class="form-hint" style="margin:0; font-size:11px;">{{ formatFileTime(f.lastModified) }}</div>
              </div>
              <button class="btn btn-sm btn-ghost" style="padding:2px 8px; font-size:12px;" @click="deleteFileBackup(f)" title="删除该备份"><AppIcon name="trash" />  删除</button>
              <button class="btn btn-sm btn-warning" @click="confirmRestoreBackup(f)" :disabled="restoringBackup">↩ 恢复</button>
            </div>
          </div>
        </div>
        <p v-else class="form-hint" style="margin-top:8px; margin-bottom:0;">
          <AppIcon name="lightbulb" />  文件夹备份需要绑定本地存储文件夹（浏览器 File System Access 权限）。旧版独立备份文件夹中的 <code>auto_backup_*.json</code> 仍可用「导入 JSON」恢复。
        </p>
      </div>

      <input ref="importInput" type="file" accept=".json" style="display:none" @change="handleImport" />
      </div>

      <!-- easyScholar API 配置 -->
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="microscope" />  easyScholar API 配置</h2>
        </div>
        <p class="form-hint">
          easyScholar 是一款显示期刊影响因子和分区的浏览器扩展。配置 Secret Key 后，在论文中心添加文献时可直接查询期刊的影响因子、SCI 分区等信息。<br/>
          <AppIcon name="pin" />  获取方式：注册 <a href="https://www.easyscholar.cc" target="_blank" style="color:var(--color-primary);">easyscholar.cc</a> → 个人中心 → 开放接口 → 复制 Secret Key
        </p>
        <div class="form-group" style="margin-top:12px;">
          <label class="form-label">Secret Key</label>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <input class="input" v-model="easyscholarKey" placeholder="粘贴 easyScholar Secret Key" style="max-width:420px; font-family: monospace; flex:1;" />
            <button class="btn btn-sm btn-primary" @click="saveEasyscholarKey" :disabled="!easyscholarKeyDirty"><AppIcon name="save" />  保存</button>
            <button class="btn btn-sm btn-ghost" @click="testEasyscholarKey" :disabled="!easyscholarKey"><AppIcon name="flask" />  测试</button>
          </div>
          <div v-if="easyscholarKeySaved" class="form-hint" style="color:var(--color-success); margin-top:4px;"><AppIcon name="check-circle" />  Secret Key 已保存</div>
          <div v-if="easyscholarTestResult" class="form-hint" style="margin-top:4px;" :style="{ color: easyscholarTestResult.ok ? 'var(--color-success)' : 'var(--color-danger)' }">
            {{ easyscholarTestResult.ok ? '测试成功！API 可用' : '测试失败：' + easyscholarTestResult.msg }}
          </div>
        </div>
      </div>

      <!-- 平台版本与更新 -->
      <div class="card section-card">
        <div class="card-header">
          <h2 class="card-title"><AppIcon name="tag" />  平台版本与更新</h2>
        </div>
        <!-- 平台版本号 -->
        <div class="form-group" style="margin-top:12px;">
          <label class="form-label"><AppIcon name="settings" />  平台版本号</label>
          <input class="input" v-model="form.config.appVersion" placeholder="如：v2.0、研二第一版" @input="markDirty" style="max-width:240px;" />
        </div>
        <!-- GitHub 更新令牌 -->
        <div class="form-group" style="margin-top:16px;">
          <label class="form-label"><AppIcon name="key" />  GitHub 更新令牌</label>
          <p class="form-hint" style="margin-bottom:10px;">用于检查更新和下载安装包。当内置令牌过期导致"检查更新失败"时，在此填入新令牌即可恢复，无需重新发版。</p>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <input class="input" v-model="githubTokenInput" placeholder="github_pat_..." style="max-width:420px; font-family: monospace; font-size:12px;" />
            <button class="btn btn-sm btn-primary" @click="saveGithubToken" :disabled="!githubTokenInput || githubTokenInput === settingsStore.githubUpdateToken"><AppIcon name="save" />  保存</button>
            <button v-if="settingsStore.githubUpdateToken" class="btn btn-sm btn-ghost" @click="clearGithubToken"><AppIcon name="trash" />  清除</button>
          </div>
          <div v-if="githubTokenSaved" class="form-hint" style="color:var(--color-success); margin-top:4px;"><AppIcon name="check-circle" />  令牌已保存，下次检查更新时生效</div>
        </div>
      </div>
      </div>

      <!-- 右列：偏好设置 -->
      <div class="settings-col settings-col-right">
    <!-- 偏好设置 -->
    <div class="card section-card">
      <div class="card-header">
        <h2 class="card-title">偏好设置</h2>
      </div>

      <!-- PDF 打开方式 -->
      <div class="subsection-box">
        <label class="form-label">PDF 打开方式</label>
        <p class="form-hint" style="margin-bottom:8px;">选择论文列表中点击 <AppIcon name="file-text" />  按钮时的 PDF 打开方式。</p>
        <!-- 桌面版：系统默认程序 / 自定义软件（无需本地桥接服务） -->
        <template v-if="isDesktop">
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
            <label class="opener-radio" :class="{ active: settingsStore.pdfOpener === 'browser' }">
              <input type="radio" name="pdfOpener" value="browser" :checked="settingsStore.pdfOpener === 'browser'" @change="onPdfOpenerChange('browser')" />
              <AppIcon name="check-circle" />  系统默认程序
            </label>
            <label class="opener-radio" :class="{ active: settingsStore.pdfOpener === 'custom' }">
              <input type="radio" name="pdfOpener" value="custom" :checked="settingsStore.pdfOpener === 'custom'" @change="onPdfOpenerChange('custom')" />
              <AppIcon name="wrench" />  自定义软件
            </label>
          </div>
          <div v-if="settingsStore.pdfOpener === 'custom'" style="margin-top:8px;">
            <div style="display:flex; gap:8px; align-items:center;">
              <input class="input" v-model="customPdfPath" placeholder="软件完整路径，如 C:\Program Files\SumatraPDF\SumatraPDF.exe" style="flex:1;" @input="appCheckResult = null" />
              <button class="btn btn-sm btn-secondary" @click="browseCustomExe" title="选择本机已安装的 PDF 阅读器"><AppIcon name="folder-open" />  浏览</button>
              <button class="btn btn-sm btn-primary" @click="saveCustomPdfPath" :disabled="!customPdfPath.trim()"><AppIcon name="save" />  保存</button>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:6px;">
              <span class="text-tertiary" style="font-size:12px;">桌面版可直接调用本机软件打开 PDF，无需本地桥接服务。选择软件后保存即可。</span>
            </div>
          </div>
        </template>
        <!-- 浏览器版：保留原有选项 -->
        <template v-else>
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <label class="opener-radio" :class="{ active: settingsStore.pdfOpener === 'browser' }">
            <input type="radio" name="pdfOpener" value="browser" :checked="settingsStore.pdfOpener === 'browser'" @change="onPdfOpenerChange('browser')" />
            <AppIcon name="globe" />  浏览器内置
          </label>
          <label class="opener-radio" :class="{ active: settingsStore.pdfOpener === 'custom' }">
            <input type="radio" name="pdfOpener" value="custom" :checked="settingsStore.pdfOpener === 'custom'" @change="onPdfOpenerChange('custom')" />
            <AppIcon name="wrench" />  自定义软件
          </label>
        </div>
        <div v-if="settingsStore.pdfOpener === 'custom'" style="margin-top:8px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <input class="input" v-model="customPdfPath" placeholder="软件完整路径，如 C:\Program Files\SumatraPDF\SumatraPDF.exe" style="flex:1;" @input="appCheckResult = null" />
            <input ref="customExeInput" type="file" accept=".exe,.lnk" style="display:none" @change="onCustomExePick" />
            <button class="btn btn-sm btn-secondary" @click="browseCustomExe" title="网页端受浏览器安全限制，只能获取文件名；推荐使用「自动检测」"><AppIcon name="folder-open" />  浏览</button>
            <button class="btn btn-sm btn-secondary" @click="detectLocalApps" :disabled="detectingApps || bridgeStatus !== 'online'" title="自动扫描本机已安装的 PDF 阅读器"><AppIcon name="search" />  {{ detectingApps ? '检测中...' : '自动检测' }}</button>
            <button class="btn btn-sm btn-outline" @click="verifyCustomApp" :disabled="!customPdfPath.trim() || verifyingApp" title="校验路径是否有效（需服务在线）"><AppIcon name="check" />  {{ verifyingApp ? '校验中...' : '验证' }}</button>
            <button class="btn btn-sm btn-primary" @click="saveCustomPdfPath" :disabled="!customPdfPath.trim()"><AppIcon name="save" />  保存</button>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:6px;">
            <span v-if="appCheckResult && appCheckResult.found" class="bridge-ok" style="font-size:12px;">✓ 路径有效：{{ appCheckResult.resolved || customPdfPath }}</span>
            <span v-else-if="appCheckResult && !appCheckResult.found" class="bridge-err" style="font-size:12px;">✗ 未找到该软件，请用「自动检测」选择已装阅读器，或填写完整路径（不要带引号、不要只填软件名）</span>
            <span v-else class="text-tertiary" style="font-size:12px;">提示：网页端「浏览」只能取到文件名，无法取到完整路径，建议点「自动检测」直接选择本机已装的 PDF 阅读器。</span>
          </div>
          <div v-if="detectedApps.length" class="bridge-box" style="margin-top:6px; padding:8px 10px;">
            <div class="text-tertiary" style="font-size:12px; margin-bottom:4px;">检测到以下已安装的 PDF 阅读器，点击即填入：</div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div v-for="app in detectedApps" :key="app.path" class="detect-app-item" @click="useDetectedApp(app)">
                <AppIcon name="file-text" />
                <span style="font-size:13px; font-weight:500;">{{ app.name }}</span>
                <span class="text-tertiary" style="font-size:12px; margin-left:auto; word-break:break-all;">{{ app.path }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 本地桥接服务（浏览器打开本地软件方案） -->
        <div class="bridge-box" style="margin-top:10px;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <strong style="font-size:13px;">本地桥接服务（网页端一键打开本地软件）</strong>
            <span v-if="bridgeStatus === 'checking'" class="bridge-dot" style="background:#9CA3AF;"></span>
            <span v-else-if="bridgeStatus === 'online'" class="bridge-dot" style="background:#10B981;"></span>
            <span v-else class="bridge-dot" style="background:#EF4444;"></span>
            <span v-if="bridgeStatus === 'checking'" class="text-tertiary" style="font-size:12px;">检测中...</span>
            <span v-else-if="bridgeStatus === 'online'" class="bridge-ok" style="font-size:12px;">● 服务在线，可直接调用本地软件打开 PDF</span>
            <span v-else class="bridge-err" style="font-size:12px;">● 服务未运行（见下方说明）</span>
            <button class="btn btn-ghost btn-sm" style="margin-left:auto;" @click="checkBridgeStatus"><AppIcon name="refresh-cw" />  重新检测</button>
          </div>
          <p class="form-hint" style="margin-top:6px; line-height:1.7;">
            浏览器出于安全限制无法直接启动本地软件。解决方案：在电脑上运行一个本地小服务（免安装，仅需 Node.js），
            网页会把 PDF 发送给该服务，由它保存到本地目录（默认 <code>文档/WorkbenchPDF</code>，可自定义）并用你配置的软件打开。
          </p>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; align-items:center;">
            <span class="text-tertiary" style="font-size:12px;">PDF 保存目录：</span>
            <input class="input" v-model="bridgeSaveDir" placeholder="留空 = 默认 文档/WorkbenchPDF，例：D:\Papers\PDF" style="flex:1; min-width:220px;" />
            <button class="btn btn-sm btn-secondary" @click="saveBridgeDirCfg"><AppIcon name="save" />  保存目录</button>
            <span v-if="bridgeDirSaved" class="bridge-ok" style="font-size:12px;">已保存</span>
          </div>
          <p class="form-hint" style="margin-top:4px;">自定义目录需为绝对路径；保存后打开 PDF 即存入该目录，服务在线时会同步写入本地 bridge-config.json。</p>
          <div v-if="bridgeStatus === 'offline'" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; align-items:center;">
            <a class="btn btn-sm btn-secondary" :href="bridgeFileUrl" download="server.cjs"><AppIcon name="download" />  下载服务脚本 server.cjs</a>
            <a class="btn btn-sm btn-secondary" :href="bridgeBatUrl" download="启动桥接服务.bat"><AppIcon name="download" />  下载启动器（Windows）</a>
            <span class="text-tertiary" style="font-size:12px;">下载后将两个文件放在同一文件夹，双击「启动桥接服务.bat」即可</span>
          </div>
        </div>
        </template>
      </div>

      <!-- 导航栏样式 -->
      <div class="theme-section" style="margin-top:18px;">
        <label class="form-label">导航栏样式</label>
        <p class="form-hint">选择主导航的呈现方式。侧边栏为经典布局；悬浮岛式为圆角悬浮半透明侧栏，Logo 与版本号移至顶部状态栏；融合态将一级导航与二级导航融为一体，水平居中显示，点击进入二级导航，主页按钮返回。</p>
        <div class="navstyle-layout">
          <button
            class="navstyle-card"
            :class="{ active: form.theme.navStyle === 'sidebar' }"
            @click="form.theme.navStyle = 'sidebar'; markDirty()"
          >
            <div class="navstyle-preview navstyle-sidebar-preview">
              <div class="ns-sidebar">
                <span class="ns-dot"></span><span class="ns-dot"></span><span class="ns-dot"></span><span class="ns-dot"></span>
              </div>
              <div class="ns-content">
                <div class="ns-bar"></div>
                <div class="ns-lines"><span></span><span></span><span></span></div>
              </div>
            </div>
            <span class="navstyle-label">经典侧边栏</span>
          </button>
          <button
            class="navstyle-card"
            :class="{ active: form.theme.navStyle === 'floating' }"
            @click="form.theme.navStyle = 'floating'; markDirty()"
          >
            <div class="navstyle-preview navstyle-floating-preview">
              <div class="ns-island">
                <span class="ns-dot"></span><span class="ns-dot"></span><span class="ns-dot"></span><span class="ns-dot"></span>
              </div>
              <div class="ns-content">
                <div class="ns-bar"></div>
                <div class="ns-lines"><span></span><span></span><span></span></div>
              </div>
            </div>
            <span class="navstyle-label">悬浮岛式</span>
          </button>
          <button
            class="navstyle-card"
            :class="{ active: form.theme.navStyle === 'merge' }"
            @click="form.theme.navStyle = 'merge'; markDirty()"
          >
            <div class="navstyle-preview navstyle-merge-preview">
              <div class="ns-merge-bar">
                <span class="ns-dot"></span><span class="ns-dot"></span><span class="ns-dot"></span><span class="ns-dot"></span>
              </div>
              <div class="ns-content">
                <div class="ns-lines"><span></span><span></span><span></span></div>
              </div>
            </div>
            <span class="navstyle-label">融合态</span>
          </button>
        </div>
      </div>

      <!-- 主题配色 -->
      <div class="theme-section" style="margin-top:18px;">
        <label class="form-label">主题配色</label>
        <p class="form-hint">自定义导航栏与状态栏连体区域的背景颜色。左侧选择预设配色（含新增渐变），右侧使用自定义颜色球或输入精确色值。</p>
        <!-- 当前效果预览 -->
        <div class="theme-preview" :style="{ background: themeColorPreview }">
          <span class="theme-preview-label">预览：导航栏 + 状态栏背景色</span>
          <span class="theme-preview-hex">{{ themeColorPreviewLabel }}</span>
        </div>
        <!-- 左右排版：预设颜色（冷色系） | 自定义颜色 -->
        <div class="theme-layout">
          <!-- 左：预设色系 -->
          <div class="theme-presets-col">
            <span class="palette-label">渐变色系</span>
            <div class="theme-presets gradient-presets">
              <button
                v-for="c in gradientPaletteColors"
                :key="c.hex"
                class="theme-swatch theme-swatch-gradient"
                :class="{ active: isThemeGradient(form.theme.navBgColor) && form.theme.navBgColor === c.hex }"
                :style="{ background: c.css }"
                :title="c.name"
                @click="pickThemeColor(c.hex)"
              ></button>
            </div>
            <span class="palette-label" style="margin-top:14px;">冷色系</span>
            <div class="theme-presets">
              <button
                v-for="c in coolPaletteColors"
                :key="c.hex"
                class="theme-swatch"
                :class="{ active: form.theme.navBgColor === c.hex }"
                :style="{ background: c.hex }"
                :title="c.name"
                @click="pickThemeColor(c.hex)"
              ></button>
            </div>
          </div>
          <!-- 右：自定义颜色 -->
          <div class="theme-custom-col">
            <label class="form-label" style="margin:0 0 10px;">自定义颜色</label>
            <div class="theme-custom-row">
              <ColorPresetPicker :modelValue="form.theme.navBgColor || '#F8F9FB'" @update:modelValue="pickThemeColor" class="theme-color-ball" />
              <div class="theme-param-group">
                <div class="theme-param-row">
                  <span class="theme-param-label">HEX</span>
                  <input
                    class="input input-sm theme-hex-input"
                    :value="form.theme.navBgColor || '#F8F9FB'"
                    @input="pickThemeColor($event.target.value)"
                    placeholder="#F8F9FB"
                  />
                </div>
                <div class="theme-param-row">
                  <span class="theme-param-label">R</span>
                  <input class="input input-sm theme-rgb-input" type="number" min="0" max="255" :value="rgbValues.r" @input="onRgbInput('r', $event)" />
                  <span class="theme-param-label">G</span>
                  <input class="input input-sm theme-rgb-input" type="number" min="0" max="255" :value="rgbValues.g" @input="onRgbInput('g', $event)" />
                  <span class="theme-param-label">B</span>
                  <input class="input input-sm theme-rgb-input" type="number" min="0" max="255" :value="rgbValues.b" @input="onRgbInput('b', $event)" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:12px;" @click="resetTheme">恢复默认</button>

        <!-- 自定义渐变 -->
        <div style="margin-top:16px; padding-top:14px; border-top:1px dashed var(--color-border);">
          <label class="form-label">自定义渐变</label>
          <p class="form-hint" style="margin-bottom:10px;">选择两个颜色组成自定义渐变作为导航栏/状态栏背景色。</p>
          <div class="custom-gradient-row">
            <div class="custom-gradient-picker">
              <span class="custom-gradient-label">起始色</span>
              <input type="color" v-model="customGradient.c1" class="color-input" />
              <input type="text" v-model="customGradient.c1" class="input input-sm custom-gradient-hex" maxlength="7" />
            </div>
            <span class="custom-gradient-arrow">→</span>
            <div class="custom-gradient-picker">
              <span class="custom-gradient-label">结束色</span>
              <input type="color" v-model="customGradient.c2" class="color-input" />
              <input type="text" v-model="customGradient.c2" class="input input-sm custom-gradient-hex" maxlength="7" />
            </div>
            <div class="custom-gradient-preview" :style="{ background: `linear-gradient(135deg, ${customGradient.c1}, ${customGradient.c2})` }">
              <span>预览</span>
            </div>
            <button class="btn btn-sm btn-primary" @click="applyCustomGradient"><AppIcon name="check" />  应用渐变</button>
          </div>
        </div>
      </div>

      <!-- 页面背景图 -->
      <div class="theme-section" style="margin-top:18px;">
        <label class="form-label">页面背景图片</label>
        <p class="form-hint">上传图片作为平台背景（覆盖状态栏以下所有区域），可调节透明度。顶部状态栏颜色仍由上方主题配色控制。</p>
        <div class="bg-upload-row">
          <input ref="bgImageInput" type="file" accept="image/*" style="display:none;" @change="onBgImageSelected" />
          <button class="btn btn-sm btn-primary" @click="triggerBgUpload"><AppIcon name="upload" />  选择图片</button>
          <button v-if="form.backgroundImage" class="btn btn-sm btn-ghost" @click="removeBgImage"><AppIcon name="trash" />  移除背景</button>
          <div v-if="form.backgroundImage" class="bg-thumbnail" :style="{ backgroundImage: `url(${form.backgroundImage})` }"></div>
        </div>
        <div v-if="form.backgroundImage" class="bg-opacity-row">
          <label class="bg-opacity-label">透明度：{{ Math.round(form.backgroundImageOpacity * 100) }}%</label>
          <input type="range" min="0" max="1" step="0.01" :value="form.backgroundImageOpacity" @input="onBgOpacityInput" class="bg-opacity-slider" />
        </div>
      </div>

      <!-- 毛玻璃效果（统一开关） -->
      <div class="theme-section" style="margin-top:18px;">
        <label class="form-label">毛玻璃效果</label>
        <p class="form-hint">选择平台整体的视觉风格。「不透明」模式下所有页面（含下拉菜单）恢复纯白底色；「毛玻璃」模式下内容区、导航栏、二级导航栏及下拉菜单均呈现半透明毛玻璃效果，可透出背景图片。</p>
        <div style="display:flex; gap:12px; margin-top:8px;">
          <button class="btn btn-sm" :class="!form.moduleFrosted ? 'btn-primary' : 'btn-ghost'" @click="onFrostedToggle(false)" style="min-width:88px;">不透明</button>
          <button class="btn btn-sm" :class="form.moduleFrosted ? 'btn-primary' : 'btn-ghost'" @click="onFrostedToggle(true)" style="min-width:88px;">毛玻璃</button>
        </div>
        <div v-if="form.moduleFrosted" class="bg-opacity-row" style="margin-top:12px;">
          <label class="bg-opacity-label">透明度：{{ Math.round(form.moduleOpacity * 100) }}%</label>
          <input type="range" min="0.3" max="1" step="0.01" :value="form.moduleOpacity" @input="onUnifiedOpacityInput" class="bg-opacity-slider" />
        </div>
      </div>

      <!-- 顶部状态栏效果 -->
      <div class="theme-section" style="margin-top:18px;">
        <label class="form-label">顶部状态栏效果</label>
        <p class="form-hint">控制最顶部状态栏（含日期、消息、头像等）的视觉风格。不透明为默认纯白底色；毛玻璃模式下背景图延伸至状态栏区域，状态栏呈现半透明毛玻璃效果，底部与内容区自然渐变融合；融合态下状态栏底色完全去掉，logo、标题、头像等直接悬浮显示在背景图上。</p>
        <div style="display:flex; gap:12px; margin-top:8px;">
          <button class="btn btn-sm" :class="form.topBarEffect === 'opaque' ? 'btn-primary' : 'btn-ghost'" @click="onTopBarEffectChange('opaque')" style="min-width:88px;">不透明</button>
          <button class="btn btn-sm" :class="form.topBarEffect === 'frosted' ? 'btn-primary' : 'btn-ghost'" @click="onTopBarEffectChange('frosted')" style="min-width:88px;">毛玻璃</button>
          <button class="btn btn-sm" :class="form.topBarEffect === 'float' ? 'btn-primary' : 'btn-ghost'" @click="onTopBarEffectChange('float')" style="min-width:88px;">融合态</button>
        </div>
        <div v-if="form.topBarEffect === 'frosted'" class="bg-opacity-row" style="margin-top:12px;">
          <label class="bg-opacity-label">状态栏透明度：{{ Math.round(form.topBarOpacity * 100) }}%</label>
          <input type="range" min="0.2" max="1" step="0.01" :value="form.topBarOpacity" @input="onTopBarOpacityInput" class="bg-opacity-slider" />
        </div>
      </div>


    </div>
    </div>
    </div>

    <!-- 清除确认弹窗 -->
    <div v-if="showClearConfirm" class="modal-overlay" @click.self="(e) => window.__mwDblClose(e, () => { showClearConfirm = false })">
      <div class="modal-content" style="max-width: 400px;">
        <button class="modal-close-x" @click="showClearConfirm = false" title="关闭">✕</button>
        <div style="padding: 24px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;"><AppIcon name="alert-triangle" /> </div>
          <h3 style="margin-bottom: 8px;">确认清除所有数据？</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 20px;">
            此操作将删除所有任务、论文、组会纪要、积分等数据，且<strong style="color: var(--color-danger);">不可恢复</strong>。<br/>
            建议先导出备份。
          </p>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="btn btn-ghost" @click="showClearConfirm = false">取消</button>
            <button class="btn btn-danger" @click="clearData">确认清除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入结果确认弹窗 -->
    <div v-if="showImportResult" class="modal-overlay" @click.self="closeImportResult">
      <div class="modal-content" style="max-width: 500px;">
        <button class="modal-close-x" @click="closeImportResult" title="关闭">✕</button>
        <div style="padding: 24px;">
          <div style="font-size: 40px; text-align:center; margin-bottom: 8px;">{{ importResult && importResult.ok ? '' : '' }}</div>
          <h3 style="text-align:center; margin-bottom: 6px;">导入{{ importResult && importResult.ok ? '完成' : '失败' }}</h3>
          <p style="text-align:center; color: var(--color-text-secondary); margin-bottom: 14px;">
            <template v-if="importResult">共 {{ importResult.total }} 个模块：成功 {{ importResult.success }}，失败 {{ importResult.failed }}<template v-if="importResult.skipped">&nbsp;，跳过 {{ importResult.skipped }}</template></template>
            <template v-else>未读取到有效的备份数据</template>
          </p>
          <!-- 模块明细列表 -->
          <div v-if="importResult && importResult.modules.length" class="import-result-list" style="max-height: 260px; overflow-y: auto;">
            <div v-for="m in importResult.modules" :key="m.key" class="import-result-row" style="display:flex; align-items:center; gap:8px; padding:6px 8px; border-bottom:1px solid var(--color-border-light); font-size:13px;">
              <span style="flex:1; color:var(--color-text-primary);">{{ m.name }}<span style="color:var(--color-text-tertiary); font-size:12px; margin-left:6px;">({{ m.key }})</span></span>
              <span v-if="m.status === 'success'" style="color:#16A34A; font-weight:500;">✓ 成功</span>
              <span v-else-if="m.status === 'skipped'" style="color:#D97706; font-weight:500;"><AppIcon name="chevron-right" />  跳过</span>
              <span v-else style="color:#DC2626; font-weight:500;">✗ {{ m.reason || '失败' }}</span>
            </div>
          </div>
          <!-- 保留未覆盖模块提示 -->
          <div v-if="importResult && importResult.keptModules && importResult.keptModules.length" style="margin-top:10px; padding:10px 12px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; font-size:13px; color:#0369a1;">
            <AppIcon name="lightbulb" />  以下模块在当前数据中存在、但导入文件中没有，已<strong>原样保留</strong>（不会删除）：
            <div style="margin-top:4px;">{{ importResult.keptModules.map(k => k.name).join('、') }}</div>
          </div>
          <div style="display:flex; justify-content:center; margin-top: 18px;">
            <button class="btn btn-primary" @click="closeImportResult">知道了，刷新生效</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出结果确认弹窗 -->
    <div v-if="showExportResult" class="modal-overlay" @click.self="closeExportResult">
      <div class="modal-content" style="max-width: 520px;">
        <button class="modal-close-x" @click="closeExportResult" title="关闭">✕</button>
        <div style="padding: 24px;">
          <div style="font-size: 40px; text-align:center; margin-bottom: 8px;"><AppIcon name="download" /> </div>
          <h3 style="text-align:center; margin-bottom: 6px;">导出完成</h3>
          <p style="text-align:center; color: var(--color-text-secondary); margin-bottom: 4px;">
            共 {{ exportResult ? exportResult.totalModules : 0 }} 个模块 · 总计 {{ exportResult ? formatSize(exportResult.totalSize) : '-' }}
          </p>
          <p style="text-align:center; color: var(--color-text-tertiary); font-size:12px; margin-bottom: 4px;">
            文件名：{{ exportResult ? exportResult.filename : '' }} · 导出时间：{{ exportResult ? exportResult.exportedAt : '' }}
          </p>
          <p v-if="exportResult && exportResult.savedPath" style="text-align:center; color: var(--color-text-tertiary); font-size:11px; margin-bottom: 12px; word-break: break-all;">
            已保存至：{{ exportResult.savedPath }}
          </p>
          <div class="import-result-list" style="max-height: 280px; overflow-y: auto; border:1px solid var(--color-border-light); border-radius:8px;">
            <div v-for="m in (exportResult ? exportResult.modules : [])" :key="m.key" style="display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid var(--color-border-light); font-size:13px;">
              <span style="flex:1; color:var(--color-text-primary);">{{ m.name }}<span style="color:var(--color-text-tertiary); font-size:12px; margin-left:6px;">({{ m.key }})</span></span>
              <span style="color:var(--color-text-secondary); font-size:12px;">{{ m.count }} 条</span>
              <span style="color:var(--color-text-tertiary); font-size:12px;">{{ formatSize(m.size) }}</span>
            </div>
          </div>
          <div style="display:flex; justify-content:center; margin-top: 18px;">
            <button class="btn btn-primary" @click="closeExportResult">知道了</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 恢复备份确认弹窗 -->
    <div v-if="showRestoreBackupConfirm" class="modal-overlay" @click.self="showRestoreBackupConfirm = false">
      <div class="modal-content" style="max-width: 440px;">
        <button class="modal-close-x" @click="showRestoreBackupConfirm = false" title="关闭">✕</button>
        <div style="padding: 24px; text-align: center;">
          <div style="font-size: 42px; margin-bottom: 10px;">↩️</div>
          <h3 style="margin-bottom: 8px;">确认恢复该备份？</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 14px;">
            <template v-if="restoreBackupTarget">
              <strong>{{ backupKindLabel(restoreBackupTarget.kind) }}</strong><br/>
              <code style="font-size:11px;">{{ restoreBackupTarget.name }}</code><br/>
              {{ formatFileTime(restoreBackupTarget.lastModified) }} · {{ formatSize(restoreBackupTarget.size) }}<br/><br/>
            </template>
            将把数据恢复到该备份时刻的状态；恢复前会自动备份当前数据，可随时反悔。当前数据中备份未包含的模块<strong>不会删除</strong>。
          </p>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button class="btn btn-ghost" @click="showRestoreBackupConfirm = false">取消</button>
            <button class="btn btn-warning" @click="doRestoreBackup" :disabled="restoringBackup">{{ restoringBackup ? '恢复中…' : '确认恢复' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useSettingsStore, useResearchStore, usePaperLibraryStore } from '../stores'
import { save, load, uid, saveTextToFile, listBackupFiles, deleteBackupFile, writeManualBackup, formatBytes, isAutoBackupEnabled, setAutoBackupEnabled, getLastAutoBackupAt, compressImage } from '../utils/storage'
import { isFileStorageActive, getFolderName, selectStorageFolder, clearStorageFolder, listStorageFiles, needsRegrant, regrantPermission } from '../utils/fileStorage'
import { isBackupActive, getBackupFolderName, selectBackupFolder as _selectBackupFolder, clearBackupFolder, regrantBackupPermission, initBackupStorage } from '../utils/fileStorage'
import { isFileStorageActive as _eisActive, getFolderName as _egetFolderName, selectStorageFolder as _eselectFolder, clearStorageFolder as _eclearFolder, listStorageFiles as _elistFiles, initFileStorage as _einit, needsRegrant as _eneedsRegrant } from '../utils/electronFileStorage'
import { isBackupActive as _ebIsActive, getBackupFolderName as _ebGetName, selectBackupFolder as _ebSelect, clearBackupFolder as _ebClear, initBackupStorage as _ebInit } from '../utils/electronFileStorage'
import { migrateToFileStorage, syncFromFileStorage } from '../utils/storage'
import { initPdfDir, selectPdfDir as selectPdfFolder, getPdfDirInfo, regrantPdfPermission, unbindPdfDir as unbindPdf } from '../utils/paperPdfStorage'
import { checkBridgeOnline, fetchBridgeSaveDir, saveBridgeConfig, findLocalApps, checkLocalApp } from '../utils/localBridge'
import { isTauriRuntime } from '../utils/tauriFs'
import ColorPresetPicker from '../components/common/ColorPresetPicker.vue'

// 检测 Electron 环境
const isElectron = !!(window.electronAPI && window.electronAPI.isElectron)

const settingsStore = useSettingsStore()
const researchStore = useResearchStore()
const paperLibraryStore = usePaperLibraryStore()

// 桌面版（Tauri）环境检测
const isDesktop = isTauriRuntime()

// 本地文件存储
const fileStorageActive = ref(isElectron ? _eisActive() : isFileStorageActive())
const fileStorageFolder = ref(isElectron ? _egetFolderName() : getFolderName())
const _needsRegrant = isElectron ? _eneedsRegrant : needsRegrant
const folderHandleExists = ref(_needsRegrant() || fileStorageActive.value || fileStorageFolder.value !== '')
const folderFiles = ref([])

// JSON 自动备份
const backupActive = ref(isElectron ? _ebIsActive() : isBackupActive())
const backupFolderName = ref(isElectron ? _ebGetName() : getBackupFolderName())
const backupNeedsRegrant = ref(false)

// 自动备份开关与状态
const autoBackupEnabled = ref(isAutoBackupEnabled())
const lastAutoBackupAt = ref(getLastAutoBackupAt())
const autoBackupStatusText = computed(() => {
  if (!autoBackupEnabled.value) return '已关闭：数据修改后不会自动备份，建议保留开启。'
  if (!fileStorageActive.value && !backupActive.value) {
    return '待生效：绑定本地存储文件夹后，数据修改将自动备份。'
  }
  const t = lastAutoBackupAt.value
  if (!t) return '已开启：数据修改后 3 秒内自动备份到本地文件夹 backups/ 目录。'
  const diff = Date.now() - t
  if (diff < 60000) return `已开启：最近一次自动备份在 ${Math.floor(diff / 1000)} 秒前。`
  if (diff < 3600000) return `已开启：最近一次自动备份在 ${Math.floor(diff / 60000)} 分钟前。`
  return `已开启：最近一次自动备份在 ${Math.floor(diff / 3600000)} 小时前。`
})

function toggleAutoBackup() {
  const enabled = !autoBackupEnabled.value
  autoBackupEnabled.value = enabled
  setAutoBackupEnabled(enabled)
  if (enabled) lastAutoBackupAt.value = getLastAutoBackupAt()
}

// 冷色系预设（仅保留冷色系）
const coolPaletteColors = [
  { name: '冰川', hex: '#D1ECF1' },
  { name: '雾灰', hex: '#D5DBDB' },
  { name: '银蓝', hex: '#B0C4DE' },
  { name: '石板', hex: '#708090' },
  { name: '冷灰', hex: '#A9B2B6' },
  { name: '雪青', hex: '#E0EEEE' },
  { name: '钢蓝', hex: '#4682B4' },
  { name: '冷绿', hex: '#90A4A4' },
  { name: '薄暮', hex: '#BCC6CC' },
  { name: '霜白', hex: '#F0F8FF' },
  { name: '青瓷', hex: '#A3C1AD' },
  { name: '冷棕', hex: '#8D9496' },
]

// 渐变色系预设（5 组）：存储格式 "gradient:色1:色2" —— 整体偏浅色系，确保导航文字清晰
const gradientPaletteColors = [
  { name: '暖阳', hex: 'gradient:#FFF3C4:#BFE3F5', css: 'linear-gradient(135deg, #FFF3C4, #BFE3F5)', c1: '#FFF3C4', c2: '#BFE3F5' },
  { name: '深蓝乳白', hex: 'gradient:#5BA3E0:#FAF2E0', css: 'linear-gradient(135deg, #5BA3E0, #FAF2E0)', c1: '#5BA3E0', c2: '#FAF2E0' },
  { name: '奶黄青', hex: 'gradient:#FFFBE6:#7FD8E5', css: 'linear-gradient(135deg, #FFFBE6, #7FD8E5)', c1: '#FFFBE6', c2: '#7FD8E5' },
  { name: '森绿', hex: 'gradient:#A8D89A:#FBF1D7', css: 'linear-gradient(135deg, #A8D89A, #FBF1D7)', c1: '#A8D89A', c2: '#FBF1D7' },
  { name: '清波', hex: 'gradient:#7FD8E5:#C4E6DC', css: 'linear-gradient(135deg, #7FD8E5, #C4E6DC)', c1: '#7FD8E5', c2: '#C4E6DC' },
]

// 判断是否为渐变主题
function isThemeGradient(val) {
  return typeof val === 'string' && val.startsWith('gradient:')
}

// 渐变预览 CSS：拆出两个颜色
function gradientCss(val) {
  if (!isThemeGradient(val)) return val || '#F8F9FB'
  const [, c1, c2] = val.split(':')
  return `linear-gradient(135deg, ${c1}, ${c2})`
}

// 渐变预览文案：显示两个色值
function gradientLabel(val) {
  if (!isThemeGradient(val)) return val || '#F8F9FB'
  const [, c1, c2] = val.split(':')
  return `${c1} → ${c2}`
}

// 主题预览色（支持渐变）
const themeColorPreview = computed(() => {
  const val = form.theme.navBgColor || '#F8F9FB'
  return gradientCss(val)
})

// 主题预览文字（渐变显示两色）
const themeColorPreviewLabel = computed(() => {
  const val = form.theme.navBgColor || '#F8F9FB'
  return gradientLabel(val)
})

// RGB 分解：仅用于自定义单色；若为渐变则取第一个颜色
const rgbValues = computed(() => {
  let hex = (form.theme.navBgColor || '#F8F9FB').replace('#', '')
  if (isThemeGradient(form.theme.navBgColor)) {
    const [, c1] = form.theme.navBgColor.split(':')
    hex = c1.replace('#', '')
  }
  const r = parseInt(hex.substring(0, 2), 16) || 248
  const g = parseInt(hex.substring(2, 4), 16) || 249
  const b = parseInt(hex.substring(4, 6), 16) || 251
  return { r, g, b }
})

function pickThemeColor(hex) {
  // 渐变主题直接使用完整字符串
  if (isThemeGradient(hex)) {
    form.theme.navBgColor = hex
    markDirty()
    return
  }
  if (!hex.startsWith('#')) hex = '#' + hex
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return
  form.theme.navBgColor = hex
  markDirty()
}

function onRgbInput(channel, e) {
  const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0))
  const { r, g, b } = { ...rgbValues.value, [channel]: val }
  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  form.theme.navBgColor = hex
  markDirty()
}

function resetTheme() {
  form.theme.navBgColor = ''
  markDirty()
}

// 应用自定义渐变
function applyCustomGradient() {
  form.theme.navBgColor = `gradient:${customGradient.c1}:${customGradient.c2}`
  markDirty()
}

// 背景图上传
const bgImageInput = ref(null)
function triggerBgUpload() {
  bgImageInput.value?.click()
}
async function onBgImageSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 8 * 1024 * 1024) {
    alert('图片不能超过 8MB，请选择更小的图片')
    return
  }
  try {
    const reader = new FileReader()
    reader.onload = async () => {
      // 压缩图片到合理尺寸（长边 1920px），降低 localStorage 存储压力
      const compressed = await compressImage(reader.result, { maxSize: 1920, quality: 0.82, type: 'image/jpeg' })
      form.backgroundImage = compressed
      markDirty()
    }
    reader.readAsDataURL(file)
  } catch (err) {
    alert('图片读取失败：' + (err.message || '未知错误'))
  }
  // 清空 input 以便重复选择同一文件
  e.target.value = ''
}
function removeBgImage() {
  form.backgroundImage = ''
  markDirty()
}
function onBgOpacityInput(e) {
  form.backgroundImageOpacity = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0))
  markDirty()
}
// 统一毛玻璃开关：控制 moduleFrosted（不影响 topBarEffect，由用户独立选择）
function onFrostedToggle(frosted) {
  form.moduleFrosted = frosted
  settingsStore.setModuleFrosted(frosted)
  markDirty()
}
// 统一透明度滑块：同步 moduleOpacity / navOpacity / subNavOpacity
function onUnifiedOpacityInput(e) {
  const val = Math.max(0.3, Math.min(1, parseFloat(e.target.value) || 0.88))
  form.moduleOpacity = val
  form.navOpacity = val
  form.subNavOpacity = val
  settingsStore.setModuleOpacity(val)
  settingsStore.setNavOpacity(val)
  settingsStore.setSubNavOpacity(val)
  markDirty()
}
// 顶部状态栏效果切换
function onTopBarEffectChange(effect) {
  form.topBarEffect = effect
  settingsStore.setTopBarEffect(effect)
  markDirty()
}
// 顶部状态栏透明度
function onTopBarOpacityInput(e) {
  form.topBarOpacity = Math.max(0.2, Math.min(1, parseFloat(e.target.value) || 0.78))
  settingsStore.setTopBarOpacity(form.topBarOpacity)
  markDirty()
}

// 文件列表相关
const totalFileSize = computed(() => folderFiles.value.reduce((sum, f) => sum + f.size, 0))

async function refreshFileList() {
  if (!fileStorageActive.value) {
    folderFiles.value = []
    return
  }
  try {
    const listFn = isElectron ? _elistFiles : listStorageFiles
    folderFiles.value = await listFn()
  } catch {
    folderFiles.value = []
  }
}

async function selectFolder() {
  try {
    const selectFn = isElectron ? _eselectFolder : selectStorageFolder
    const name = await selectFn()
    if (name) {
      fileStorageActive.value = true
      fileStorageFolder.value = isElectron ? _egetFolderName() : name
      const pulled = await syncFromFileStorage()
      const pushed = await migrateToFileStorage()
      await refreshFileList()
      await loadBackupFiles()
      alert(
        `已连接文件夹「${fileStorageFolder.value}」！\n` +
        (pulled ? `已从本地文件夹恢复 ${pulled} 项数据。\n` : '') +
        (pushed ? `已同步 ${pushed} 项到本地硬盘。` : '')
      )
    }
  } catch (e) {
    alert('选择文件夹失败：' + e.message)
  }
}

async function changeFolder() {
  if (!confirm('更换文件夹后，系统将把当前数据同步到新文件夹。\n原文件夹中的数据不会自动删除。\n\n确定继续吗？')) return
  try {
    const selectFn = isElectron ? _eselectFolder : selectStorageFolder
    const name = await selectFn()
    if (name) {
      fileStorageFolder.value = isElectron ? _egetFolderName() : name
      fileStorageActive.value = true
      const count = await migrateToFileStorage()
      await refreshFileList()
      alert(`已更换为文件夹「${fileStorageFolder.value}」！\n已同步 ${count} 项数据。`)
    }
  } catch (e) {
    alert('更换文件夹失败：' + e.message)
  }
}

async function unbindFolder() {
  if (confirm('确定取消文件夹绑定吗？\n\n数据仍保留在本地文件夹中，取消后系统将回退到使用浏览器 localStorage 存储。')) {
    const clearFn = isElectron ? _eclearFolder : clearStorageFolder
    await clearFn()
    fileStorageActive.value = false
    fileStorageFolder.value = ''
    folderFiles.value = []
    backupFiles.value = []
    alert('已取消文件夹绑定。')
  }
}

// JSON 自动备份
async function selectBackupFolder() {
  try {
    const selectFn = isElectron ? _ebSelect : _selectBackupFolder
    const name = await selectFn()
    if (name) {
      backupActive.value = true
      backupFolderName.value = isElectron ? _ebGetName() : name
      backupNeedsRegrant.value = false
      alert(`已开启自动备份！\n备份文件将保存至「${backupFolderName.value}」文件夹。\n\n每次数据修改后自动导出 JSON 备份（防抖 30 秒）。`)
    }
  } catch (e) {
    alert('选择备份文件夹失败：' + e.message)
  }
}

async function changeBackupFolder() {
  try {
    const name = await _selectBackupFolder()
    if (name) {
      backupActive.value = true
      backupFolderName.value = name
      backupNeedsRegrant.value = false
      alert(`已更换备份文件夹为「${name}」。`)
    }
  } catch (e) {
    alert('更换失败：' + e.message)
  }
}

async function unbindBackupFolder() {
  if (confirm('确定关闭自动备份吗？\n\n已生成的备份文件不会自动删除。')) {
    const clearFn = isElectron ? _ebClear : clearBackupFolder
    await clearFn()
    backupActive.value = false
    backupFolderName.value = ''
    backupNeedsRegrant.value = false
    alert('已关闭自动备份。')
  }
}

async function regrantBackupAccess() {
  if (isElectron) {
    backupActive.value = true
    backupNeedsRegrant.value = false
    alert('权限已恢复！自动备份已重新激活。')
    return
  }
  try {
    const ok = await regrantBackupPermission()
    if (ok) {
      backupActive.value = true
      backupNeedsRegrant.value = false
      alert('权限已恢复！自动备份已重新激活。')
    } else {
      alert('权限恢复失败，请重新选择备份文件夹。')
    }
  } catch (e) {
    alert('恢复权限失败：' + e.message)
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function formatFileTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  const now = Date.now()
  const diff = Math.floor((now - d.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getFilePurpose(file) {
  const name = (file.name || '').toLowerCase()
  if (name.startsWith('paperlibrary')) return '论文列表数据'
  if (name.startsWith('paper')) return '论文/文献数据'
  if (name.startsWith('task')) return '任务数据'
  if (name.startsWith('plan')) return '计划数据'
  if (name.startsWith('meeting')) return '组会纪要'
  if (name.startsWith('research')) return '科研数据'
  if (name.startsWith('points') || name.startsWith('transactions')) return '积分数据'
  if (name.startsWith('milestone')) return '培养节点'
  if (name.startsWith('nav')) return '导航配置'
  if (name.startsWith('profile') || name.startsWith('config') || name.startsWith('setting') || name.startsWith('theme')) return '系统配置'
  if (name.startsWith('log') || name.startsWith('operation')) return '操作日志'
  if (name.startsWith('changelog')) return '更新记录'
  if (name.startsWith('easyscholar') || name.includes('pdf')) return 'API/文件配置'
  if (name.endsWith('.pdf')) return '论文 PDF 文件'
  return '其他数据'
}

// 本地表单数据
const form = reactive({
  config: { ...settingsStore.config, appVersion: settingsStore.appVersion },
  customMeetingFields: settingsStore.customMeetingFields.map(f => ({ ...f })),
  milestones: researchStore.milestones.map(m => ({ ...m })),
  theme: { ...settingsStore.theme },
  backgroundImage: settingsStore.backgroundImage || '',
  backgroundImageOpacity: settingsStore.backgroundImageOpacity ?? 0.12,
  navOpacity: settingsStore.navOpacity ?? 0.78,
  subNavOpacity: settingsStore.subNavOpacity ?? 0.92,
  moduleOpacity: settingsStore.moduleOpacity ?? 0.88,
  moduleFrosted: settingsStore.moduleFrosted ?? true,
  topBarEffect: settingsStore.topBarEffect ?? 'opaque',
  topBarOpacity: settingsStore.topBarOpacity ?? 0.78,
})

// 自定义渐变两色
const customGradient = reactive({
  c1: '#FFF3C4',
  c2: '#BFE3F5',
})

const hasChanges = ref(false)
const showClearConfirm = ref(false)
// 导入结果弹窗
const showImportResult = ref(false)
const importResult = ref(null)
const importInput = ref(null)
// 自动备份与文件回退（v3 单文件夹方案）
const backupFiles = ref([])
const restoringBackup = ref(false)
// 导出结果弹窗
const showExportResult = ref(false)
const exportResult = ref(null)
// 恢复备份确认弹窗
const showRestoreBackupConfirm = ref(false)
const restoreBackupTarget = ref(null)

function markDirty() {
  hasChanges.value = true
}

function saveAll() {
  settingsStore.updateConfig({ ...form.config })
  settingsStore.setAppVersion(form.config.appVersion || '')
  settingsStore.updateTheme({ ...form.theme })
  settingsStore.setBackgroundImage(form.backgroundImage || '')
  settingsStore.setBackgroundImageOpacity(form.backgroundImageOpacity)
  settingsStore.setNavOpacity(form.navOpacity)
  settingsStore.setSubNavOpacity(form.subNavOpacity)
  settingsStore.setModuleOpacity(form.moduleOpacity)
  settingsStore.setModuleFrosted(form.moduleFrosted)
  settingsStore.setTopBarEffect(form.topBarEffect)
  settingsStore.setTopBarOpacity(form.topBarOpacity)
  settingsStore.customMeetingFields = form.customMeetingFields.map(f => ({ ...f }))
  save('customMeetingFields', settingsStore.customMeetingFields)
  researchStore.updateAllMilestones(form.milestones.map(m => ({ ...m })))
  hasChanges.value = false
  alert('所有设置已保存！')
}

// PDF 打开方式
const customPdfPath = ref(settingsStore.pdfOpenerPath)
const customExeInput = ref(null)
const detectedApps = ref([])
const detectingApps = ref(false)
const verifyingApp = ref(false)
const appCheckResult = ref(null) // { found: boolean, resolved: string }

async function browseCustomExe() {
  // 桌面版：Tauri 原生「选择文件」对话框，能拿到完整路径
  if (isDesktop) {
    try {
      const { open: tauriOpen } = await import('@tauri-apps/plugin-dialog')
      const selected = await tauriOpen({
        multiple: false,
        filters: [{ name: '可执行程序', extensions: ['exe', 'lnk', 'com'] }],
        title: '选择 PDF 阅读器程序'
      })
      if (selected && typeof selected === 'string') {
        customPdfPath.value = selected
        appCheckResult.value = null
        settingsStore.setPdfOpenerPath(selected)
        alert('已选择并保存：\n' + selected)
      }
    } catch (e) {
      alert('选择软件失败：' + (e.message || '未知错误'))
    }
    return
  }
  // 浏览器版：file input（拿不到完整路径）
  customExeInput.value?.click()
}

function onCustomExePick(e) {
  const file = e.target.files?.[0]
  if (!file) return
  // 浏览器安全限制：网页端拿不到文件完整路径，只有文件名。
  // 桌面端（Tauri）可通过 webkitRelativePath 拿相对路径，仍非绝对路径，故提示用户改用「自动检测」或手动输入。
  customPdfPath.value = file.name
  appCheckResult.value = null
  alert('浏览器出于安全限制，无法获取所选文件的完整路径（只能拿到文件名：' + file.name + '）。\n\n请改用「自动检测」选择本机已安装的 PDF 阅读器，或手动输入软件完整路径（如 C:\\Program Files\\SumatraPDF\\SumatraPDF.exe）。')
}

async function detectLocalApps() {
  if (bridgeStatus.value !== 'online') {
    alert('本地桥接服务未运行，无法检测本机软件。请先下载并启动桥接服务（见下方说明）。')
    return
  }
  detectingApps.value = true
  detectedApps.value = []
  const apps = await findLocalApps()
  detectingApps.value = false
  if (!apps.length) {
    alert('未检测到已安装的常见 PDF 阅读器。请手动输入软件完整路径（如 C:\\Program Files\\SumatraPDF\\SumatraPDF.exe）。')
    return
  }
  detectedApps.value = apps
}

function useDetectedApp(app) {
  customPdfPath.value = app.path
  detectedApps.value = []
  appCheckResult.value = { found: true, resolved: app.path }
  settingsStore.setPdfOpenerPath(app.path)
  alert('已选用「' + app.name + '」：\n' + app.path + '\n\n保存成功，打开 PDF 时将直接使用该软件。')
}

async function verifyCustomApp() {
  const input = customPdfPath.value.trim()
  if (!input) return
  verifyingApp.value = true
  const r = await checkLocalApp(input)
  verifyingApp.value = false
  if (bridgeStatus.value !== 'online' && !r.resolved) {
    appCheckResult.value = { found: false, resolved: '' }
    return
  }
  appCheckResult.value = r
}

function onPdfOpenerChange(opener) {
  settingsStore.setPdfOpener(opener)
}

async function saveCustomPdfPath() {
  const path = customPdfPath.value.trim()
  if (!path) return
  // 桌面版：直接保存，无需桥接校验
  if (!isDesktop) {
    // 桥接在线时先校验，无效则提醒（仍允许保存，用户可能稍后安装软件）
    if (bridgeStatus.value === 'online') {
      const r = await checkLocalApp(path)
      appCheckResult.value = r
      if (!r.found) {
        if (!confirm('未找到软件「' + path + '」，保存后打开 PDF 会失败。\n\n确定要保存吗？建议先点「自动检测」选择已装阅读器。')) {
          return
        }
      }
    }
  }
  settingsStore.setPdfOpenerPath(path)
  alert('自定义软件路径已保存！')
}

// 本地桥接服务状态
const bridgeStatus = ref('checking') // checking | online | offline
const bridgeSaveDir = ref(settingsStore.bridgeSaveDir || '')
const bridgeDirSaved = ref(false)

async function checkBridgeStatus() {
  bridgeStatus.value = 'checking'
  const online = await checkBridgeOnline(1200)
  bridgeStatus.value = online ? 'online' : 'offline'
  if (online) {
    const dir = await fetchBridgeSaveDir(800)
    if (dir && !bridgeSaveDir.value.trim()) bridgeSaveDir.value = dir
  }
}

async function saveBridgeDirCfg() {
  const dir = bridgeSaveDir.value.trim()
  settingsStore.setBridgeSaveDir(dir)
  bridgeDirSaved.value = true
  setTimeout(() => (bridgeDirSaved.value = false), 2000)
  if (!dir) {
    alert('已恢复默认保存目录（文档/WorkbenchPDF）。')
    return
  }
  const r = await saveBridgeConfig(dir)
  if (r.ok) {
    alert('保存目录已生效：' + r.saveDir)
  } else {
    alert('已保存到平台设置；但桥接服务未运行或写入失败（' + (r.error || '') + '）。\n启动桥接服务后，打开 PDF 时即自动使用该目录；也可手动编辑 server.js 同目录的 bridge-config.json。')
  }
}
const bridgeFileUrl = computed(() => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  return base + '/tools/local-bridge/server.cjs'
})
const bridgeBatUrl = computed(() => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  return base + '/tools/local-bridge/' + encodeURIComponent('启动桥接服务.bat')
})

// 数据管理
async function exportData() {
  const data = settingsStore.exportAllData()
  const filename = `研究生工作台_备份_${new Date().toISOString().slice(0, 10)}.json`
  const path = await saveTextToFile(filename, JSON.stringify(data, null, 2), 'application/json')
  const detail = data.detail || { totalModules: 0, totalSize: 0, modules: [] }
  exportResult.value = { ...detail, filename, savedPath: path || '', exportedAt: data.exportedAt }
  showExportResult.value = true
}

function closeExportResult() {
  showExportResult.value = false
  exportResult.value = null
}

// 备份列表（主文件夹 backups/）
async function loadBackupFiles() {
  if (!fileStorageActive.value) {
    backupFiles.value = []
    return
  }
  backupFiles.value = await listBackupFiles()
  lastAutoBackupAt.value = getLastAutoBackupAt()
}

function backupKindLabel(kind) {
  return kind === 'snapshot' ? '升级/导入快照' : kind === 'manual' ? '手动备份' : '自动备份'
}

async function doManualBackup() {
  if (restoringBackup.value) return
  const ok = await writeManualBackup()
  if (ok) {
    await loadBackupFiles()
    alert('已手动备份到本地文件夹 backups/ 目录。')
  } else {
    alert('手动备份失败：请确认已绑定本地存储文件夹（浏览器需要 File System Access 权限）。')
  }
}

function confirmRestoreBackup(f) {
  restoreBackupTarget.value = f
  showRestoreBackupConfirm.value = true
}

async function doRestoreBackup() {
  if (!restoreBackupTarget.value || restoringBackup.value) return
  const f = restoreBackupTarget.value
  restoringBackup.value = true
  try {
    const result = await settingsStore.restoreFromFileBackup(f.name)
    showRestoreBackupConfirm.value = false
    restoreBackupTarget.value = null
    if (!result.ok) {
      alert('恢复失败：' + (result.reason || '未知错误'))
    } else {
      importResult.value = result
      showImportResult.value = true
    }
  } catch (e) {
    alert('恢复失败：' + e.message)
  } finally {
    restoringBackup.value = false
  }
}

async function deleteFileBackup(f) {
  if (!confirm(`确定删除备份「${f.name}」？\n\n删除后无法再回退到该时间点。`)) return
  await deleteBackupFile(f.name)
  await loadBackupFiles()
}

function triggerImport() { importInput.value?.click() }

function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      if (confirm('导入将恢复备份文件中的数据模块；\n当前数据中未被备份覆盖的模块会保留，不会被删除。\n\n确认继续吗？')) {
        const result = settingsStore.importAllData(data)
        if (!result.ok || result.total === 0) {
          alert('导入失败：未找到有效的备份数据，请选择正确的备份文件。')
        } else {
          // 展示导入结果明细弹窗，关闭后刷新使各模块生效
          importResult.value = result
          showImportResult.value = true
        }
      }
    } catch {
      alert('文件格式错误，请选择正确的备份文件。')
    } finally {
      e.target.value = ''
    }
  }
  reader.readAsText(file)
}

// 关闭导入结果弹窗并刷新（导入的数据已写入 localStorage，需 reload 让各模块读取）
function closeImportResult() {
  showImportResult.value = false
  importResult.value = null
  window.location.reload()
}

function clearData() {
  settingsStore.clearAllData()
}

async function regrantFolderAccess() {
  if (isElectron) {
    fileStorageActive.value = true
    folderHandleExists.value = true
    await refreshFileList()
    alert('权限已恢复！本地存储已重新激活。')
    return
  }
  const ok = await regrantPermission()
  if (ok) {
    fileStorageActive.value = true
    folderHandleExists.value = true
    await refreshFileList()
    alert('权限已恢复！本地存储已重新激活。')
  } else {
    alert('授权失败，请检查浏览器设置或重新选择文件夹。')
  }
}

// 论文 PDF 存放位置
const pdfDirActive = ref(false)
const pdfDirName = ref('')
const pdfDirNeedsRegrant = ref(false)

async function loadPdfDirStatus() {
  const info = await initPdfDir()
  pdfDirActive.value = info.active
  pdfDirName.value = info.name
  pdfDirNeedsRegrant.value = !!info.needsRegrant
}

async function selectPdfDir() {
  try {
    const result = await selectPdfFolder()
    pdfDirActive.value = result.active
    pdfDirName.value = result.name
    pdfDirNeedsRegrant.value = false
  } catch (e) {
    if (e.message !== 'AbortError') {
      alert('选择文件夹失败：' + e.message)
    }
  }
}

async function changePdfDir() {
  if (!confirm('更换文件夹后，新上传的 PDF 将保存到新目录。确定继续吗？')) return
  try {
    const result = await selectPdfFolder()
    pdfDirActive.value = result.active
    pdfDirName.value = result.name
    pdfDirNeedsRegrant.value = false
    alert('已更换为文件夹「' + result.name + '」')
  } catch (e) {
    if (e.message !== 'AbortError') {
      alert('更换文件夹失败：' + e.message)
    }
  }
}

async function regrantPdfDir() {
  const ok = await regrantPdfPermission()
  if (ok) {
    pdfDirActive.value = true
    pdfDirNeedsRegrant.value = false
    const info = getPdfDirInfo()
    pdfDirName.value = info.name
    alert('权限已恢复！')
  } else {
    alert('授权失败，请重新选择文件夹。')
  }
}

async function unbindPdfDir() {
  if (confirm('确定取消 PDF 存放目录绑定吗？')) {
    await unbindPdf()
    pdfDirActive.value = false
    pdfDirName.value = ''
    pdfDirNeedsRegrant.value = false
  }
}

// easyScholar API 配置
const easyscholarKey = ref(load('easyscholarKey', ''))
const easyscholarKeySaved = ref(!!load('easyscholarKey', ''))
const easyscholarKeyDirty = ref(false)
const easyscholarTestResult = ref(null)

// GitHub 更新令牌
const githubTokenInput = ref(settingsStore.githubUpdateToken || '')
const githubTokenSaved = ref(false)

function saveGithubToken() {
  const token = githubTokenInput.value.trim()
  if (!token) return
  settingsStore.setGithubUpdateToken(token)
  githubTokenSaved.value = true
  setTimeout(() => { githubTokenSaved.value = false }, 3000)
}

function clearGithubToken() {
  settingsStore.setGithubUpdateToken('')
  githubTokenInput.value = ''
  githubTokenSaved.value = false
}

watch(easyscholarKey, (val) => {
  easyscholarKeyDirty.value = val !== load('easyscholarKey', '')
  if (easyscholarKeyDirty.value) {
    easyscholarKeySaved.value = false
    easyscholarTestResult.value = null
  }
})

function saveEasyscholarKey() {
  save('easyscholarKey', easyscholarKey.value.trim())
  easyscholarKeySaved.value = true
  easyscholarKeyDirty.value = false
}

async function testEasyscholarKey() {
  easyscholarTestResult.value = null
  try {
    const url = `https://www.easyscholar.cc/open/getPublicationRank?secretKey=${encodeURIComponent(easyscholarKey.value.trim())}&publicationName=Nature`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.code === 200) {
      easyscholarTestResult.value = { ok: true }
    } else {
      easyscholarTestResult.value = { ok: false, msg: data.msg || '密钥无效' }
    }
  } catch (e) {
    easyscholarTestResult.value = { ok: false, msg: e.message }
  }
}

onMounted(() => {
  lastAutoBackupAt.value = getLastAutoBackupAt()
  checkBridgeStatus()
  if (fileStorageActive.value) {
    refreshFileList()
    loadBackupFiles()
  }
  loadPdfDirStatus()
  const backupInitFn = isElectron ? _ebInit : initBackupStorage
  backupInitFn().then(result => {
    if (result === 'prompt') {
      backupNeedsRegrant.value = true
      backupActive.value = false
    } else if (result === 'active') {
      backupActive.value = true
      backupFolderName.value = getBackupFolderName()
      backupNeedsRegrant.value = false
    }
  })
})
</script>

<style scoped>
.settings-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title-row {
  margin-bottom: 16px;
}
.page-heading {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  color: var(--color-text-primary);
}

/* 保存栏 */
.save-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
  border: 1px solid var(--color-border-light);
  position: sticky;
  top: 0;
  z-index: 50;
}
.save-bar.dirty {
  border-color: var(--color-warning);
  background: var(--color-warning-bg);
}
.save-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.save-bar.dirty .save-hint {
  color: var(--color-warning);
  font-weight: 500;
}

.section-card {
  padding: 20px;
  margin-bottom: 16px;
}

/* 平台设置：左右两栏布局（数据管理在左，偏好设置+API配置在右） */
.settings-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.settings-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.settings-col-left {
  flex: 0 0 48%;
  max-width: 48%;
}
.settings-col-right {
  flex: 1;
  min-width: 0;
}
/* 窄屏（<1100px）回退为上下瀑布流 */
@media (max-width: 1100px) {
  .settings-layout {
    flex-direction: column;
  }
  .settings-col-left,
  .settings-col-right {
    flex: 1;
    max-width: 100%;
    width: 100%;
  }
}
.settings-col .section-card {
  margin-bottom: 0;
}
.card-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.subsection-box {
  padding: 12px 14px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}
.subsection-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.subsection-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-text-primary);
}

.form-group { margin-bottom: 12px; }
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--color-text-secondary);
}
.form-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
  line-height: 1.5;
}

.data-table-wrapper {
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.data-table th:nth-child(1) { width: 35%; }
.data-table th:nth-child(2) { width: 60px; }
.data-table th:nth-child(3) { width: auto; }
.data-table th:nth-child(4) { width: 70px; }
.data-table th:nth-child(5) { width: 120px; }
.data-table th:nth-child(6) { width: 160px; }
.data-table th {
  position: sticky;
  top: 0;
  background: var(--color-bg);
  padding: 8px 10px;
  text-align: left;
  color: var(--color-text-secondary);
  font-weight: 600;
  border-bottom: 1px solid var(--color-border-light);
  z-index: 1;
}
.data-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.data-table tr:hover td {
  background: var(--color-bg);
}
.data-table code {
  font-size: 11px;
  color: var(--color-primary);
  background: var(--color-primary-bg);
  padding: 1px 5px;
  border-radius: 3px;
}

.file-key {
  font-size: 11px;
  color: var(--color-text-secondary);
}
.file-purpose {
  font-size: 11px;
  color: var(--color-text-secondary);
  background: var(--color-primary-bg);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.file-list-section {
  margin-top: 12px;
}

.data-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }

/* 本地存储文件夹 */
.auto-export-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 12px 14px;
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
  border: 1px solid rgba(37, 99, 235, 0.12);
}
.auto-export-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.auto-export-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.auto-export-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}
.auto-export-desc code {
  font-size: 11px;
  background: var(--color-bg);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--color-primary);
}

/* PDF 打开方式 */
.opener-radio {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  background: white;
  transition: all var(--transition-fast);
}
.opener-radio:hover {
  border-color: var(--color-primary);
}
.opener-radio.active {
  background: var(--color-primary-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.opener-radio input[type="radio"] {
  display: none;
}

/* 本地桥接服务 */
.bridge-box {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  background: var(--color-bg-secondary, #f8fafc);
}
.bridge-ok {
  color: #10B981;
}
.bridge-err {
  color: #EF4444;
}
.bridge-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.detect-app-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  background: white;
  transition: all var(--transition-fast);
}
.detect-app-item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

/* 导航栏样式选择 */
.navstyle-layout {
  display: flex;
  gap: 10px;
  flex-wrap: nowrap;
  margin-top: 10px;
}
.navstyle-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.navstyle-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.navstyle-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}
.navstyle-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.navstyle-preview {
  width: 100%;
  height: 60px;
  border-radius: var(--radius-sm);
  background: #F1F5F9;
  display: flex;
  overflow: hidden;
  position: relative;
}
.navstyle-sidebar-preview .ns-sidebar {
  width: 22px;
  background: #E2E8F0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-shrink: 0;
}
.navstyle-floating-preview .ns-island {
  width: 24px;
  height: 42px;
  background: rgba(255,255,255,0.9);
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 7px 0 0 7px;
  flex-shrink: 0;
}
.ns-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #94A3B8;
}
.ns-dot:first-child { background: #3B82F6; }
.ns-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 7px 8px;
  gap: 4px;
}
.ns-bar {
  height: 8px;
  background: #CBD5E1;
  border-radius: 2px;
  width: 60%;
}
.ns-lines {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 3px;
}
.ns-lines span {
  height: 3px;
  background: #E2E8F0;
  border-radius: 2px;
}
.ns-lines span:nth-child(1) { width: 90%; }
.ns-lines span:nth-child(2) { width: 75%; }
.ns-lines span:nth-child(3) { width: 85%; }

/* 融合态预览图：水平居中的导航条 */
.navstyle-merge-preview {
  justify-content: center;
  align-items: center;
}
.navstyle-merge-preview .ns-merge-bar {
  width: 84px;
  height: 20px;
  background: rgba(255,255,255,0.9);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  position: absolute;
  top: 7px;
  left: 50%;
  transform: translateX(-50%);
}
.navstyle-merge-preview .ns-content {
  margin-top: 28px;
  width: 100%;
}

/* 主题配色 */
.theme-section {
  padding: 14px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}
.theme-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  margin-bottom: 14px;
  transition: background 0.3s ease;
}
.theme-preview-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  mix-blend-mode: difference;
  filter: invert(1) grayscale(1) contrast(9);
}
.theme-preview-hex {
  font-size: 12px;
  font-family: monospace;
  mix-blend-mode: difference;
  filter: invert(1) grayscale(1) contrast(9);
}
.theme-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.theme-presets-col {
  flex: 0 0 auto;
  min-width: 180px;
}
.palette-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}
.theme-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.theme-swatch {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}
.theme-swatch:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.theme-swatch.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
  transform: scale(1.1);
}
/* 渐变预设色块：稍微加大以展示渐变效果，加细内描边增强区分度 */
.gradient-presets {
  gap: 8px;
}
.theme-swatch-gradient {
  width: 44px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.65);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
}
.theme-swatch-gradient:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.theme-swatch-gradient.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-bg);
  transform: scale(1.08);
}
.theme-custom-col {
  flex: 1;
  min-width: 200px;
  max-width: 100%;
  overflow: hidden;
}
.theme-custom-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.theme-color-ball {
  flex-shrink: 0;
  margin-top: 2px;
}
.theme-param-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.theme-param-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.theme-param-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  width: 14px;
}
.theme-hex-input {
  width: 100% !important;
  font-family: monospace;
}
.theme-rgb-input {
  width: 64px !important;
  min-width: 64px;
  flex-shrink: 0;
  text-align: center;
  padding: 6px 4px;
  font-size: 13px;
}

/* 自动备份开关 */
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.toggle-switch input[type="checkbox"] {
  appearance: none;
  width: 38px;
  height: 20px;
  background: #cbd5e1;
  border-radius: 999px;
  position: relative;
  outline: none;
  cursor: pointer;
  transition: background 0.2s ease;
}
.toggle-switch input[type="checkbox"]::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle-switch input[type="checkbox"]:checked {
  background: var(--color-primary, #4F46E5);
}
.toggle-switch input[type="checkbox"]:checked::after {
  transform: translateX(18px);
}

@media (max-width: 640px) {
  .theme-layout {
    flex-direction: column;
  }
}

/* 自定义渐变 */
.custom-gradient-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.custom-gradient-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}
.custom-gradient-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.color-input {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 0;
  background: none;
}
.color-input::-webkit-color-swatch-wrapper { padding: 0; }
.color-input::-webkit-color-swatch { border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
.custom-gradient-hex {
  width: 70px;
  font-family: monospace;
  font-size: 12px;
}
.custom-gradient-arrow {
  font-size: 18px;
  color: var(--color-text-tertiary);
}
.custom-gradient-preview {
  width: 80px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: rgba(0,0,0,0.5);
  font-weight: 500;
}

/* 背景图上传 */
.bg-upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.bg-thumbnail {
  width: 80px;
  height: 50px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}
.bg-opacity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}
.bg-opacity-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 90px;
}
.bg-opacity-slider {
  flex: 1;
  max-width: 280px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}
.bg-opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary, #4F46E5);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.bg-opacity-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary, #4F46E5);
  cursor: pointer;
}
</style>
