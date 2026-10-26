<script setup>
import { ref, nextTick, unref, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'
import { MAX_CANVAS_EDGE } from '../constants/exportLimits'
import { useImageProcess } from '../composables/useImageProcess'

const { t, tp } = usePageI18n('crop')
const pickerRef = ref(null)
const imgRef = ref(null)
const imageUrl = ref('')
const cropDialogVisible = ref(false)
const { busy, run } = useImageProcess()
const previewVisible = ref(false)
let cropper = null
let currentFile = null
/** @type {{ el: Element, fn: (e: Event) => void } | null} */
let cropBoxDblCleanup = null
let previewObjectUrl = ''

function revokePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = ''
  }
}

function unbindCropBoxDblclick() {
  if (cropBoxDblCleanup) {
    cropBoxDblCleanup.el.removeEventListener('dblclick', cropBoxDblCleanup.fn)
    cropBoxDblCleanup = null
  }
}

function bindCropBoxDblclick() {
  unbindCropBoxDblclick()
  const box = imgRef.value?.parentElement?.querySelector('.cropper-crop-box')
  if (!box) return
  const fn = (e) => {
    e.preventDefault()
    e.stopPropagation()
    showCroppedPreview()
  }
  box.addEventListener('dblclick', fn)
  cropBoxDblCleanup = { el: box, fn }
}

function closeCropPreview() {
  previewVisible.value = false
  revokePreviewUrl()
}

function showCroppedPreview() {
  if (!cropper) return
  revokePreviewUrl()
  const canvas = cropper.getCroppedCanvas({
    maxWidth: MAX_CANVAS_EDGE,
    maxHeight: MAX_CANVAS_EDGE,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  })
  canvas.toBlob(
    (blob) => {
      if (!blob) return
      previewObjectUrl = URL.createObjectURL(blob)
      previewVisible.value = true
    },
    'image/png',
    1,
  )
}

function destroyCropper() {
  unbindCropBoxDblclick()
  if (cropper) {
    cropper.destroy()
    cropper = null
  }
}

function initCropperInstance() {
  if (!cropDialogVisible.value || !imgRef.value || !imageUrl.value) return
  const img = imgRef.value
  if (!img.complete || !img.naturalWidth) return
  destroyCropper()
  cropper = new Cropper(img, {
    viewMode: 1,
    autoCropArea: 0.85,
    responsive: true,
    ready() {
      requestAnimationFrame(() => bindCropBoxDblclick())
    },
  })
}

function onImgLoad() {
  initCropperInstance()
}

function onCropDialogOpened() {
  nextTick(() => {
    requestAnimationFrame(() => initCropperInstance())
  })
}

function onCropDialogClosed() {
  closeCropPreview()
  destroyCropper()
  imageUrl.value = ''
}

function openCropDialog() {
  const url = unref(pickerRef.value?.previewUrl)
  if (!url || !currentFile) return
  imageUrl.value = url
  cropDialogVisible.value = true
}

async function onFile(file) {
  destroyCropper()
  currentFile = file
  if (!file) {
    imageUrl.value = ''
    cropDialogVisible.value = false
    return
  }
  await nextTick()
  const url = unref(pickerRef.value?.previewUrl)
  imageUrl.value = typeof url === 'string' ? url : ''
  await nextTick()
  cropDialogVisible.value = true
}

onBeforeUnmount(() => {
  closeCropPreview()
  destroyCropper()
})

async function cropAndDownload() {
  if (!cropper || !currentFile) {
    ElMessage.warning(t('msg.selectImageCrop'))
    return
  }
  await run(async () => {
    const canvas = cropper.getCroppedCanvas({
      maxWidth: MAX_CANVAS_EDGE,
      maxHeight: MAX_CANVAS_EDGE,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    })
    const blob = await canvasToBlob(canvas, 'image/png')
    if (!blob) throw new Error('export')
    downloadBlob(blob, `${fileBaseName(currentFile)}-cropped.png`)
    ElMessage.success(t('msg.downloaded'))
  }, { errorMsg: t('msg.cropFail') })
}
</script>

<template>
  <div class="tool-page">
    <h1>{{ tp('h1') }}</h1>
    <p class="lead">{{ tp('lead') }}</p>

    <el-card class="tool-card">
      <ImagePicker ref="pickerRef" hide-preview @file="onFile" />
      <div v-if="currentFile && !cropDialogVisible" class="crop-reopen-row">
        <el-button type="primary" link @click="openCropDialog">{{ tp('reopenCrop') }}</el-button>
      </div>
    </el-card>

    <el-dialog
      v-model="cropDialogVisible"
      :title="tp('dialogTitle')"
      class="crop-dialog"
      width="min(960px, 94vw)"
      align-center
      append-to-body
      destroy-on-close
      @opened="onCropDialogOpened"
      @closed="onCropDialogClosed"
    >
      <div class="crop-dialog-inner">
        <div class="crop-dialog-canvas-wrap">
          <img
            ref="imgRef"
            :src="imageUrl"
            :alt="tp('cropAlt')"
            class="crop-target"
            @load="onImgLoad"
          />
          <div v-if="previewVisible" class="crop-preview-overlay">
            <img :src="previewObjectUrl" class="crop-preview-img" :alt="tp('cropAlt')" />
            <el-button type="primary" @click="closeCropPreview">{{ tp('backToCrop') }}</el-button>
          </div>
        </div>
        <p class="crop-dbl-hint">{{ tp('previewHint') }}</p>
        <div class="actions">
          <ToolProgressBar :visible="busy" />
          <el-button type="primary" :disabled="busy" @click="cropAndDownload">{{ tp('action') }}</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.crop-reopen-row {
  margin-top: 12px;
}

.crop-dialog-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.crop-dialog-canvas-wrap {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-height: min(68vh, calc(100dvh - 220px));
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: center;
}

.crop-preview-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px;
  box-sizing: border-box;
  background: var(--el-bg-color);
}

.crop-preview-img {
  display: block;
  max-width: 100%;
  max-height: min(56vh, calc(100dvh - 300px));
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.12);
}

.crop-dbl-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.crop-target {
  display: block;
  max-width: 100%;
}

.crop-dialog-canvas-wrap :deep(.cropper-container),
.crop-dialog-canvas-wrap :deep(.cropper-canvas),
.crop-dialog-canvas-wrap :deep(.cropper-wrap) {
  max-width: 100% !important;
  max-height: min(68vh, calc(100dvh - 220px)) !important;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>

<style>
/* append-to-body：无 scoped，保证弹层内无纵向滚动条 */
.crop-dialog .el-dialog__body {
  overflow: hidden !important;
  padding-top: 8px;
  max-height: none;
}
</style>
