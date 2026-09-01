<template>
  <div class="color-preset-picker" v-click-outside="closePopover" ref="pickerRef">
    <button class="color-trigger" :style="{ background: modelValue || '#6B7280' }" @click.stop="togglePopover" type="button" title="选择颜色"></button>
    <div v-if="open" class="color-popover" @click.stop :style="popoverStyle">
      <div class="color-section">
        <div class="color-section-title">主题色</div>
        <div class="color-grid">
          <button
            v-for="c in themeColors"
            :key="c"
            class="color-swatch"
            :style="{ background: c }"
            :class="{ active: modelValue === c }"
            @click="selectColor(c)"
            type="button"
          ></button>
        </div>
      </div>
      <div class="color-section">
        <div class="color-section-title">标准色</div>
        <div class="color-row">
          <button
            v-for="c in standardColors"
            :key="c"
            class="color-swatch"
            :style="{ background: c }"
            :class="{ active: modelValue === c }"
            @click="selectColor(c)"
            type="button"
          ></button>
        </div>
      </div>
      <div class="color-custom">
        <label class="color-custom-label">
          <span>其他颜色</span>
          <input type="color" :value="modelValue" @input="selectColor($event.target.value)" />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '#6B7280' }
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const pickerRef = ref(null)
const popoverPos = ref({ top: 0, left: 0 })
const POPOVER_W = 224
const POPOVER_H = 280

const popoverStyle = computed(() => ({
  position: 'fixed',
  top: popoverPos.value.top + 'px',
  left: popoverPos.value.left + 'px',
}))

const themeColors = [
  '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
  '#111827', '#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6',
  '#0E7490', '#0891B2', '#06B6D4', '#22D3EE', '#67E8F9',
  '#065F46', '#047857', '#059669', '#10B981', '#34D399',
  '#713F12', '#A16207', '#CA8A04', '#EAB308', '#FDE047',
  '#7C2D12', '#9A3412', '#C2410C', '#EA580C', '#FB923C',
  '#831843', '#9D174D', '#BE185D', '#DB2777', '#F472B6',
  '#581C87', '#7E22CE', '#9333EA', '#A855F7', '#C084FC',
]

const standardColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#78716C', '#000000', '#FFFFFF',
]

function togglePopover() {
  const next = !open.value
  open.value = next
  if (next) {
    nextTick(() => {
      const btn = pickerRef.value?.querySelector('.color-trigger')
      const rect = btn?.getBoundingClientRect()
      if (!rect) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      let top = rect.bottom + 6
      let left = rect.left + rect.width / 2 - POPOVER_W / 2
      // 防止右侧溢出
      if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8
      if (left < 8) left = 8
      // 防止底部溢出：向上翻转
      if (top + POPOVER_H > vh - 8) {
        top = rect.top - POPOVER_H - 6
      }
      if (top < 8) top = 8
      popoverPos.value = { top, left }
    })
  }
}

function selectColor(color) {
  emit('update:modelValue', color)
}

function closePopover() {
  open.value = false
}

// 点击外部关闭
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!el.contains(e.target)) binding.value()
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}
</script>

<style scoped>
.color-preset-picker { position: relative; display: inline-block; }
.color-trigger {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.12);
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25);
  transition: transform .12s;
}
.color-trigger:hover { transform: scale(1.08); }
.color-popover {
  position: fixed;
  z-index: 3000;
  width: 224px;
  background: #fff;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 32px rgba(0,0,0,0.14);
  padding: 12px;
}
.color-section { margin-bottom: 10px; }
.color-section-title {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-bottom: 6px;
  font-weight: 500;
}
.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.color-row {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}
.color-swatch {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: transform .1s, box-shadow .1s;
}
.color-swatch:hover { transform: scale(1.1); box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
.color-swatch.active {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.color-custom { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border-light); }
.color-custom-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}
.color-custom-label input[type="color"] {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}
</style>
