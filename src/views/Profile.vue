<template>
  <div class="profile-page">
    <div class="page-title-row">
      <h1 class="page-heading">个人信息</h1>
    </div>
    <div class="save-bar" :class="{ dirty: hasChanges }">
      <span v-if="hasChanges" class="save-hint"><AppIcon name="alert-triangle" />  有未保存的修改</span>
      <span v-else class="save-hint">所有设置已保存</span>
      <button class="btn btn-primary" :disabled="!hasChanges" @click="saveAll"><AppIcon name="save" />  保存更改</button>
    </div>

    <div class="profile-card card">
      <div class="card-header">
        <h2 class="card-title">登录人员管理</h2>
      </div>
      <div class="form-group">
        <label class="form-label">当前登录账号</label>
        <div class="login-info-display">
          <div class="login-avatar-big" @click="triggerAvatarUpload" title="点击更换头像">
            <img v-if="form.avatarImage" :src="form.avatarImage" alt="头像" class="avatar-img" />
            <span v-else class="avatar-letter">{{ settingsStore.loginUsername?.charAt(0) || '?' }}</span>
            <div class="avatar-upload-hint"><AppIcon name="camera" /> </div>
          </div>
          <div class="login-info-text">
            <span class="login-info-name">{{ settingsStore.loginUsername }}</span>
            <span class="login-info-status">已登录</span>
          </div>
        </div>
        <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="handleAvatarUpload" />
        <p class="form-hint" style="margin-top:8px;">点击头像可上传自定义头像。暂不开放注册功能，如需修改账号请联系管理员。</p>
      </div>
      <div class="form-group">
        <label class="form-label">姓名</label>
        <input class="input" v-model="form.profile.name" placeholder="你的名字" @input="markDirty" />
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">学校</label>
          <input class="input" v-model="form.profile.school" placeholder="学校名称" @input="markDirty" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label">院系</label>
          <input class="input" v-model="form.profile.department" placeholder="院系" @input="markDirty" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label">专业</label>
          <input class="input" v-model="form.profile.major" placeholder="专业方向" @input="markDirty" />
        </div>
        <div class="form-group flex-1">
          <label class="form-label">年级</label>
          <input class="input" v-model="form.profile.grade" placeholder="如：2024级" @input="markDirty" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">入学日期</label>
        <input class="input" type="date" v-model="form.profile.enrollDate" @input="markDirty" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useSettingsStore } from '../stores'
import { compressImage } from '../utils/storage'

const settingsStore = useSettingsStore()

const form = reactive({
  profile: { ...settingsStore.profile },
  avatarImage: settingsStore.avatarImage,
})

const hasChanges = ref(false)
const avatarInput = ref(null)

function markDirty() { hasChanges.value = true }

function saveAll() {
  settingsStore.updateProfile({ ...form.profile })
  settingsStore.setAvatarImage(form.avatarImage)
  hasChanges.value = false
  alert('个人信息已保存！')
}

function triggerAvatarUpload() { avatarInput.value?.click() }
async function handleAvatarUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    form.avatarImage = await compressImage(reader.result, { maxSize: 256, quality: 0.8 })
    markDirty()
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.profile-page { width: 100%; max-width: 700px; margin: 0 auto; }
.page-title-row { margin-bottom: 16px; }
.page-heading { font-size: 22px; font-weight: 700; margin: 0; color: var(--color-text-primary); }

.save-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: white; border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm); margin-bottom: 20px;
  border: 1px solid var(--color-border-light);
  position: sticky; top: 0; z-index: 50;
}
.save-bar.dirty { border-color: var(--color-warning); background: var(--color-warning-bg); }
.save-hint { font-size: 13px; color: var(--color-text-secondary); }
.save-bar.dirty .save-hint { color: var(--color-warning); font-weight: 500; }

.profile-card { padding: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-title { font-size: 16px; font-weight: 600; }

.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; color: var(--color-text-secondary); }
.form-row { display: flex; gap: 12px; }
.flex-1 { flex: 1; }
.form-hint { font-size: 13px; color: var(--color-text-secondary); line-height: 1.5; }

.login-info-display {
  display: flex; align-items: center; gap: 14px; padding: 16px;
  background: var(--color-bg); border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}
.login-avatar-big {
  width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary);
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700; flex-shrink: 0; overflow: hidden;
  position: relative; cursor: pointer; transition: opacity var(--transition-fast);
}
.login-avatar-big:hover { opacity: 0.85; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-letter { font-size: 24px; font-weight: 700; }
.avatar-upload-hint {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 18px; background: rgba(0,0,0,0.3); color: white; opacity: 0;
  transition: opacity var(--transition-fast);
}
.login-avatar-big:hover .avatar-upload-hint { opacity: 1; }
.login-info-text { display: flex; flex-direction: column; gap: 2px; }
.login-info-name { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
.login-info-status { font-size: 12px; color: var(--color-success); }
</style>
