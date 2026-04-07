<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  /** 为 true 时显示进度区域 */
  visible: { type: Boolean, default: false },
  /** 0–100 为确定进度；不传则为不定进度（循环动画） */
  percentage: { type: Number, default: undefined },
  strokeWidth: { type: Number, default: 10 },
})

const { t } = useI18n()

const determinate = computed(() => {
  const p = props.percentage
  return typeof p === 'number' && !Number.isNaN(p)
})

const barPercentage = computed(() => {
  if (!determinate.value) return 0
  return Math.min(100, Math.max(0, props.percentage))
})
</script>

<template>
  <div v-if="visible" class="tool-progress-bar" role="status" :aria-busy="true">
    <p class="tool-progress-bar__label">{{ t('msg.processing') }}</p>
    <el-progress
      :percentage="barPercentage"
      :indeterminate="!determinate"
      :stroke-width="strokeWidth"
      :duration="3"
    />
  </div>
</template>

<style scoped>
.tool-progress-bar {
  margin-bottom: 14px;
}

.tool-progress-bar__label {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
