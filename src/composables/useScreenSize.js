import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'

/**
 * 屏幕尺寸自适应 composable
 * 自动识别屏幕宽度，输出 compact(<1100px) / narrow(<768px) 两个响应式状态，
 * 供布局在「大屏幕 ↔ 小屏幕」切换时自动优化排版，避免内容溢出显示器之外。
 */
export function useScreenSize({ compact = 1100, narrow = 768 } = {}) {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)

  const update = () => {
    width.value = window.innerWidth
  }

  const isCompact = computed(() => width.value < compact)
  const isNarrow = computed(() => width.value < narrow)

  onMounted(() => window.addEventListener('resize', update))
  onUnmounted(() => window.removeEventListener('resize', update))
  // 配合 <keep-alive>：组件被缓存后重新激活时重新监听
  onActivated(() => window.addEventListener('resize', update))
  onDeactivated(() => window.removeEventListener('resize', update))

  return { width, isCompact, isNarrow }
}
