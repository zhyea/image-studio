<script setup>
import { ref } from 'vue'
import { useI18n } from '../i18n'
import ToolIcon from './ToolIcon.vue'
import { readFileAsDataURL } from '../utils/image'

const { t } = useI18n()

const props = defineProps({
  accept: { type: String, default: 'image/*' },
  disabled: { type: Boolean, default: false },
  hidePreview: { type: Boolean, default: false },
})

const emit = defineEmits(['file'])

const previewUrl = ref('')
const fileName = ref('')
const dragging = ref(false)
const inputRef = ref(null)

async function pickFile(file) {
  if (!file || !file.type.startsWith('image/')) return
  fileName.value = file.name
  previewUrl.value = await readFileAsDataURL(file)
  emit('file', file)
}

function onInputChange(e) {
  const file = e.target.files?.[0]
  if (file) pickFile(file)
  // 清空值，使「重复选择同一文件」也能触发 change
  e.target.value = ''
}

function onDragOver() {
  if (props.disabled) return
  dragging.value = true
}

function onDragLeave() {
  dragging.value = false
}

function onDrop(e) {
  dragging.value = false
  if (props.disabled) return
  pickFile(e.dataTransfer?.files?.[0])
}

function clear() {
  previewUrl.value = ''
  fileName.value = ''
  emit('file', null)
  // 同步清空 input，避免残留上一次的 File 引用
  if (inputRef.value) inputRef.value.value = ''
}

defineExpose({ clear, previewUrl, fileName })
</script>

<template>
  <div class="image-picker">
    <!-- 原生化取代 el-upload（drag）：<label> 包裹 input 使整块区域可点击，
         无需 JS 转发点击；拖拽由 dragover/drop 直接处理，省掉 EP 上传组件及其 CSS -->
    <label
      class="drop-zone"
      :class="{ 'is-dragging': dragging, 'is-disabled': disabled }"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <input
        ref="inputRef"
        class="file-input"
        type="file"
        :accept="accept"
        :disabled="disabled"
        @change="onInputChange"
      />
      <ToolIcon name="UploadFilled" :size="48" class="upload-icon" />
      <p class="upload-text">
        {{ t('picker.dragText') }}<em class="pick-link">{{ t('picker.clickPick') }}</em>
      </p>
      <div v-if="fileName" class="tip-name">{{ fileName }}</div>
    </label>

    <div v-if="previewUrl && !hidePreview" class="preview">
      <img :src="previewUrl" :alt="t('picker.previewAlt')" />
      <button type="button" class="clear-btn" :disabled="disabled" @click="clear">
        {{ t('picker.clear') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.image-picker {
  width: 100%;
}

.drop-zone {
  display: block;
  position: relative;
  padding: 28px 16px;
  border: 1px dashed var(--el-border-color, #dcdfe6);
  border-radius: 6px;
  background: var(--el-fill-color-lighter, #fafafa);
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.drop-zone:hover {
  border-color: var(--el-color-primary, #409eff);
}

.drop-zone.is-dragging {
  border-color: var(--el-color-primary, #409eff);
  background: var(--el-color-primary-light-9, #ecf5ff);
}

.drop-zone.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* 视觉隐藏但保留可聚焦与可点击（display:none 会让 label 转发失效） */
.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.file-input:focus-visible + .upload-icon {
  outline: 2px solid var(--el-color-primary, #409eff);
  outline-offset: 4px;
  border-radius: 4px;
}

.upload-icon {
  margin: 0 auto 8px;
  color: var(--el-text-color-secondary, #909399);
}

.upload-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #606266);
}

.pick-link {
  font-style: normal;
  color: var(--el-color-primary, #409eff);
  text-decoration: underline;
}

.tip-name {
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
  overflow-wrap: anywhere;
}

.preview {
  margin-top: 16px;
  text-align: center;
}

.preview img {
  max-width: 100%;
  max-height: 320px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  vertical-align: middle;
}

.clear-btn {
  display: block;
  margin: 10px auto 0;
  padding: 4px 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--el-color-danger, #f56c6c);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.clear-btn:hover {
  background: var(--el-color-danger-light-9, #fef0f0);
}

.clear-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
