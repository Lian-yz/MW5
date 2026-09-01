<template>
  <div class="glass-select" :class="[layoutClass, sizeClass]" :style="mergedStyle" ref="rootEl">
    <div class="glass-select-trigger" :class="[triggerClass, { disabled: disabled }]" @click="toggleOpen" :title="title">
      <span class="glass-select-label">{{ label }}</span>
      <svg class="glass-select-arrow" :class="{ open: isOpen }" width="10" height="6" viewBox="0 0 10 6">
        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <Teleport to="body">
      <div v-if="isOpen" class="glass-select-dropdown" :style="dropdownStyle" @click.stop>
        <div
          v-for="opt in options"
          :key="opt.value"
          class="glass-select-option"
          :class="{ active: opt.value === modelValue }"
          @click="selectOption(opt.value)"
        >
          {{ opt.label }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  // options: [{ value, label }]
  disabled: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: '' }, // 'sm' for input-sm
  selectClass: { type: String, default: '' }, // 传入的原生 class 名
  style: { type: [String, Object], default: '' },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const rootEl = ref(null)
const dropdownStyle = ref({})

const mergedStyle = computed(() => props.style || '')

const sizeClass = computed(() => props.size === 'sm' ? 'size-sm' : '')

// 将 selectClass 拆分为布局类（绑到根 div）和外观类（绑到 trigger）
// 布局类：filter-select, filter-select-col, wt-btn-select
// 外观类：input, input-sm, batch-input, note-meta-select, status-select（这些原本是给原生 select 的，现在映射到 trigger）
const LAYOUT_CLASSES = ['filter-select', 'filter-select-col', 'wt-btn-select']
const TRIGGER_CLASSES = ['input', 'input-sm', 'batch-input', 'note-meta-select', 'status-select', 'wt-btn', 'wt-btn-select']

const layoutClass = computed(() => {
  const classes = (props.selectClass || '').split(/\s+/).filter(Boolean)
  return classes.filter(c => LAYOUT_CLASSES.includes(c))
})

const triggerClass = computed(() => {
  const classes = (props.selectClass || '').split(/\s+/).filter(Boolean)
  return classes.filter(c => TRIGGER_CLASSES.includes(c))
})

const selectedOption = computed(() =>
  props.options.find(o => o.value === props.modelValue)
)

const label = computed(() => {
  if (selectedOption.value) return selectedOption.value.label
  return props.placeholder || ''
})

function toggleOpen() {
  if (props.disabled) return
  if (isOpen.value) {
    isOpen.value = false
  } else {
    isOpen.value = true
    nextTick(updateDropdownPosition)
  }
}

function updateDropdownPosition() {
  if (!rootEl.value) return
  const rect = rootEl.value.getBoundingClientRect()
  const trigger = rootEl.value.querySelector('.glass-select-trigger')
  const triggerRect = trigger ? trigger.getBoundingClientRect() : rect
  const dropdownWidth = Math.max(triggerRect.width, 120)
  // 计算下拉是否超出视口底部
  const spaceBelow = window.innerHeight - triggerRect.bottom
  const showAbove = spaceBelow < 250 && triggerRect.top > 250
  dropdownStyle.value = {
    position: 'fixed',
    left: `${triggerRect.left}px`,
    top: showAbove ? `${triggerRect.top - 8}px` : `${triggerRect.bottom + 4}px`,
    width: `${dropdownWidth}px`,
    transform: showAbove ? 'translateY(-100%)' : 'none',
    zIndex: '99999',
  }
}

function selectOption(value) {
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
}

function handleClickOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) {
    // 检查是否点击在 dropdown 上
    const dropdown = document.querySelector('.glass-select-dropdown')
    if (!dropdown || !dropdown.contains(e.target)) {
      isOpen.value = false
    }
  }
}

function handleScroll() {
  if (isOpen.value) {
    isOpen.value = false
  }
}

function handleResize() {
  if (isOpen.value) {
    updateDropdownPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.glass-select {
  display: block;
  position: relative;
}

.glass-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 12px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  background: white;
  color: var(--color-text-primary);
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  line-height: 1.4;
  white-space: nowrap;
  user-select: none;
}

.glass-select-trigger:hover {
  border-color: var(--color-primary);
}

.glass-select-trigger.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* sm 尺寸 */
.glass-select.size-sm .glass-select-trigger {
  padding: 6px 8px;
  font-size: 13px;
}

.glass-select-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.glass-select-arrow {
  flex-shrink: 0;
  transition: transform 0.2s;
  color: var(--color-text-tertiary);
}

.glass-select-arrow.open {
  transform: rotate(180deg);
}

/* 下拉面板 */
.glass-select-dropdown {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
  padding: 4px 0;
  max-height: 300px;
  overflow-y: auto;
  cursor: default;
}

.glass-select-option {
  padding: 7px 12px;
  font-size: 13px;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background var(--transition-fast);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glass-select-option:hover {
  background: var(--color-bg-hover);
}

.glass-select-option.active {
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-bg);
}
</style>

<!--
  非 scoped 全局样式：将外部 class 的布局/外观规则映射到 GlassSelect 内部
  原生 select 的 class 被拆分为布局类（绑根 div）和外观类（绑 trigger），
  此处补充各模块 scoped CSS 无法穿透的规则。
-->
<style>
/* === 根 div 布局类 === */
/* Plan.vue: .filter-select { width: 140px; flex-shrink: 0; } */
.glass-select.filter-select {
  width: 140px;
  flex-shrink: 0;
}
/* PaperCenter.vue / Finance.vue: .filter-select-col { width: 100%; } */
.glass-select.filter-select-col {
  width: 100%;
}
/* PaperCenter.vue: .wt-btn-select 内联使用 */
.glass-select.wt-btn-select {
  display: inline-block;
  width: auto;
}

/* === trigger 外观类 === */
/* PaperCenter.vue: .wt-btn-select { padding: 4px 8px; font-size: 12px; min-width: 70px; } */
.glass-select-trigger.wt-btn-select {
  padding: 4px 8px;
  font-size: 12px;
  min-width: 70px;
}
/* PaperCenter.vue: .note-meta-select { max-width: 180px; font-size: 12px; padding: 5px 8px; border-radius: var(--radius-sm); } */
.glass-select.note-meta-select .glass-select-trigger,
.glass-select .glass-select-trigger.note-meta-select {
  max-width: 180px;
  font-size: 12px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
}
/* Research.vue: .status-select { padding: 4px 8px; font-size: 12px; border-radius: var(--radius-sm); } */
.glass-select .glass-select-trigger.status-select {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: var(--radius-sm);
}
/* Finance.vue: .batch-input { font-size: 12px !important; padding: 4px 6px !important; } */
.glass-select .glass-select-trigger.batch-input {
  font-size: 12px;
  padding: 4px 6px;
}
</style>
