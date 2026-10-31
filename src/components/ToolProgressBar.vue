<script setup>
import { computed } from 'vue'
import { useI18n } from '../i18n'

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
  <!-- 原生化取代 el-progress：确定态用宽度百分比，不定态用 CSS 循环动画 -->
  <div
    v-if="visible"
    class="tool-progress-bar"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="determinate ? barPercentage : undefined"
    aria-busy="true"
  >
    <p class="tool-progress-bar__label">{{ t('msg.processing') }}</p>
    <div class="progress-track" :style="{ height: `${strokeWidth}px` }">
      <div v-if="determinate" class="progress-fill" :style="{ width: `${barPercentage}%` }"></div>
      <div v-else class="progress-indeterminate"></div>
    </div>
  </div>
</template>

<style scoped>
.tool-progress-bar {
  margin-bottom: 14px;
}

.tool-progress-bar__label {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.progress-track {
  width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: var(--el-fill-color-light, #ebeef5);
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--el-color-primary, #409eff);
  transition: width 0.3s ease;
}

.progress-indeterminate {
  width: 40%;
  height: 100%;
  border-radius: 999px;
  background: var(--el-color-primary, #409eff);
  animation: progress-slide 3s ease-in-out infinite;
}

@keyframes progress-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(250%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress-indeterminate {
    animation: none;
    width: 100%;
  }
  .progress-fill {
    transition: none;
  }
}
</style>
