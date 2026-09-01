<script setup>
import { computed } from 'vue'
import { iconMap, isEmoji } from '../icons'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 18 },
  strokeWidth: { type: [Number, String], default: 2 },
})

const emoji = computed(() => isEmoji(props.name))
const comp = computed(() => iconMap[props.name] || iconMap['circle'])
</script>

<template>
  <!-- 统一图标：尺寸/线宽/颜色由 .app-icon (global.css) 控制，颜色继承 currentColor -->
  <component
    v-if="!emoji"
    :is="comp"
    :size="size"
    :stroke-width="strokeWidth"
    class="app-icon"
  />
  <!-- 兼容旧数据中残留的 emoji 图标文本，避免空白 -->
  <span v-else class="app-icon-legacy">{{ name }}</span>
</template>
