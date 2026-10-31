<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="u-dialog-mask"
      :class="{ 'u-dialog-mask--center': alignCenter }"
      @click.self="onMaskClick"
    >
      <div ref="dlg" class="u-dialog" :class="dialogClass" role="dialog" aria-modal="true">
        <div v-if="title || closable" class="u-dialog__head">
          <h3 v-if="title" class="u-dialog__title">{{ title }}</h3>
          <button
            v-if="closable"
            type="button"
            class="u-dialog__close"
            aria-label="close"
            @click="close"
          >
            ×
          </button>
        </div>
        <div class="u-dialog__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  dialogClass: { type: String, default: '' },
  closable: { type: Boolean, default: true },
  closeOnMask: { type: Boolean, default: true },
  alignCenter: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'opened', 'closed'])

const dlg = ref(null)

function close() {
  emit('update:modelValue', false)
}

function onMaskClick() {
  if (props.closeOnMask) close()
}

function onKey(e) {
  if (e.key === 'Escape' && props.closable) close()
}

let prevOverflow = ''

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', onKey)
      // 近似 el-dialog 的 @opened：DOM 已挂载后下一帧触发
      requestAnimationFrame(() => emit('opened'))
    } else {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      emit('closed')
    }
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = prevOverflow
  document.removeEventListener('keydown', onKey)
})
</script>
