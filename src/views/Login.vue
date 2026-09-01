<template>
  <div class="login-page">
    <!-- 背景图层：优先显示用户自定义背景图（与主界面毛玻璃效果一致），否则显示默认登录背景 -->
    <div v-if="settingsStore.backgroundImage" class="login-bg-image" :style="{ backgroundImage: 'url(' + settingsStore.backgroundImage + ')', opacity: Math.max(settingsStore.backgroundImageOpacity ?? 0.12, 0.35) }"></div>
    <div v-else class="login-bg-default"></div>
    <!-- 遮罩层：保证登录卡片可读性 -->
    <div class="login-page-mask"></div>
    <div class="login-card">
      <div class="login-header">
        <img class="login-logo-img" src="/hean-logo.png" alt="牛马科技" />
        <h1>研究生工作平台</h1>
        <p class="login-subtitle">登录以继续</p>
      </div>
      <form class="login-form" @submit.prevent="doLogin">
        <div class="form-group form-group-row">
          <label class="form-label form-label-fixed">账号</label>
          <input
            class="input login-input"
            v-model="username"
            type="text"
            name="username"
            placeholder="请输入账号"
            autocomplete="username"
            @input="errorMsg = ''"
          />
        </div>
        <div class="form-group form-group-row">
          <label class="form-label form-label-fixed">密码</label>
          <div class="password-wrap">
            <input
              class="input login-input"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              @input="errorMsg = ''"
              @keyup.enter="doLogin"
            />
            <button type="button" class="toggle-pwd" @click="showPassword = !showPassword" :title="showPassword ? '隐藏密码' : '显示密码'">
              <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="remember-row">
          <label class="remember-item">
            <input type="checkbox" v-model="rememberAccount" />
            <span>记住账号</span>
          </label>
          <label class="remember-item">
            <input type="checkbox" v-model="rememberPassword" />
            <span>记住密码</span>
          </label>
        </div>
        <div v-if="errorMsg" class="login-error">{{ errorMsg }}</div>
        <button type="submit" class="btn btn-primary login-btn" :disabled="!username || !password">
          登 录
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores'

const settingsStore = useSettingsStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMsg = ref('')
const rememberAccount = ref(false)
const rememberPassword = ref(false)

// 记住账号/密码：本地明文存储（本地工具，个人设备使用）
const K_USER = 'mw_login_username'
const K_PASS = 'mw_login_password'

onMounted(() => {
  try {
    const savedUser = localStorage.getItem(K_USER)
    if (savedUser) {
      username.value = savedUser
      rememberAccount.value = true
    }
    const savedPass = localStorage.getItem(K_PASS)
    if (savedPass) {
      password.value = savedPass
      rememberPassword.value = true
    }
  } catch {}
})

function doLogin() {
  if (!username.value || !password.value) return
  if (username.value === 'LIan' && password.value === 'Lian666') {
    // 登录成功：按勾选状态保存
    try {
      if (rememberAccount.value) {
        localStorage.setItem(K_USER, username.value)
      } else {
        localStorage.removeItem(K_USER)
      }
      if (rememberPassword.value) {
        localStorage.setItem(K_PASS, password.value)
      } else {
        localStorage.removeItem(K_PASS)
      }
    } catch {}
    settingsStore.login('LIan')
  } else {
    errorMsg.value = '账号或密码错误，请重试'
    password.value = ''
  }
}
</script>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  z-index: 1000;
  overflow: hidden;
}

/* 登录页背景图层：默认登录背景 */
.login-bg-default {
  position: absolute;
  inset: 0;
  background: url('/bg-login.jpg') center / cover no-repeat;
  z-index: -1;
}

/* 登录页背景图层：用户自定义背景图（与主界面背景图一致） */
.login-bg-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -1;
  pointer-events: none;
}

/* 登录页遮罩：保证内容可读性，同时保留背景可见（毛玻璃效果） */
.login-page-mask {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(248, 249, 251, 0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  pointer-events: none;
  z-index: -1;
}

.login-card {
  position: relative;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 20px;
  box-shadow: 0 18px 50px rgba(31, 41, 55, 0.14), 0 6px 18px rgba(31, 41, 55, 0.08);
  padding: 52px 44px;
  width: 420px;
  max-width: calc(100vw - 80px);
  animation: cardFloat 6s ease-in-out infinite;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-logo-img {
  width: 56px;
  height: 56px;
  object-fit: contain;
  margin-bottom: 12px;
}

.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 6px;
}

.login-subtitle {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

/* 账号/密码 左右排列：标签在左、输入框在右 */
.form-group-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-group-row .form-label-fixed {
  flex-shrink: 0;
  width: 42px;
  margin-bottom: 0;
  text-align: right;
}

.form-group-row .login-input {
  flex: 1;
  min-width: 0;
}

.form-group-row .password-wrap {
  flex: 1;
  min-width: 0;
}

.login-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 15px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.login-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
}

.password-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrap .login-input {
  padding-right: 44px;
}

.toggle-pwd {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color var(--transition-fast);
}

.toggle-pwd:hover {
  color: var(--color-text-primary);
}

.login-error {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  text-align: center;
}

.remember-row {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: -4px;
}

.remember-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}

.remember-item input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary, #3B82F6);
  cursor: pointer;
}

.login-btn {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 4px;
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes cardFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>
