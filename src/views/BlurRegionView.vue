<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { canvasRGBA } from 'stackblur-canvas'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'

const { t, tp } = usePageI18n('blur')
const busy = ref(false)
const previewVisible = ref(false)
const previewUrl = ref('')
const previewZoom = ref(100)
const winCapPx = ref(420)
let previewObjectUrl = null

const radius = ref(12)
const imageUrl = ref('')
const stageRef = ref(null)
const stageSize = ref({ w: 0, h: 0 })
/** 模糊区域（相对预览图 %） */
const leftPct = ref(28)
const topPct = ref(28)
const widthPct = ref(44)
const heightPct = ref(32)

let currentFile = null
let objectUrl = null
let ro = null
let dragBlur = null

function revokeUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
}

function detachRo() {
  if (ro) {
    ro.disconnect()
    ro = null
  }
}

function updateStageSize() {
  const el = stageRef.value
  if (!el) return
  stageSize.value = { w: el.clientWidth, h: el.clientHeight }
}

function attachRo() {
  detachRo()
  const el = stageRef.value
  if (!el) return
  ro = new ResizeObserver(() => updateStageSize())
  ro.observe(el)
}

function clampRect() {
  widthPct.value = Math.min(Math.max(widthPct.value, 5), 100)
  heightPct.value = Math.min(Math.max(heightPct.value, 5), 100)
  leftPct.value = Math.min(Math.max(leftPct.value, 0), 100 - widthPct.value)
  topPct.value = Math.min(Math.max(topPct.value, 0), 100 - heightPct.value)
}

const previewMaxHeightStyle = computed(() => ({
  maxHeight: `${Math.round((winCapPx.value * previewZoom.value) / 100)}px`,
  maxWidth: '100%',
  width: 'auto',
  height: 'auto',
}))

function updateWinCapPx() {
  if (typeof window === 'undefined') return
  winCapPx.value = Math.max(
    160,
    Math.min(Math.round(window.innerHeight * 0.56), window.innerHeight - 260)
  )
}

function revokePreviewObject() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = null
  }
  previewUrl.value = ''
}

function onPreviewDialogClosed() {
  revokePreviewObject()
}

function onFile(file) {
  currentFile = file
  detachRo()
  revokeUrl()
  revokePreviewObject()
  previewVisible.value = false
  imageUrl.value = ''
  if (!file) return
  objectUrl = URL.createObjectURL(file)
  imageUrl.value = objectUrl
}

function onImgLoad() {
  nextTick(() => {
    updateWinCapPx()
    updateStageSize()
    attachRo()
    clampRect()
  })
}

onMounted(() => {
  updateWinCapPx()
  window.addEventListener('resize', updateWinCapPx)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWinCapPx)
  endWindowDrag()
  detachRo()
  revokeUrl()
  revokePreviewObject()
})

function onWindowMove(e) {
  if (!dragBlur) return
  const sw = Math.max(1, stageSize.value.w)
  const sh = Math.max(1, stageSize.value.h)
  const dx = ((e.clientX - dragBlur.sx) / sw) * 100
  const dy = ((e.clientY - dragBlur.sy) / sh) * 100
  const d = dragBlur
  let l = d.l
  let to = d.t
  let w = d.w
  let h = d.h

  if (d.kind === 'move') {
    l = d.l + dx
    to = d.t + dy
  } else if (d.kind === 'nw') {
    l = d.l + dx
    to = d.t + dy
    w = d.w - dx
    h = d.h - dy
  } else if (d.kind === 'ne') {
    to = d.t + dy
    w = d.w + dx
    h = d.h - dy
  } else if (d.kind === 'sw') {
    l = d.l + dx
    w = d.w - dx
    h = d.h + dy
  } else if (d.kind === 'se') {
    w = d.w + dx
    h = d.h + dy
  }

  if (d.kind !== 'move') {
    if (w < 5) {
      if (d.kind === 'nw' || d.kind === 'sw') l = d.l + d.w - 5
      w = 5
    }
    if (h < 5) {
      if (d.kind === 'nw' || d.kind === 'ne') to = d.t + d.h - 5
      h = 5
    }
  }

  leftPct.value = l
  topPct.value = to
  widthPct.value = w
  heightPct.value = h
  clampRect()
}

function endWindowDrag() {
  window.removeEventListener('pointermove', onWindowMove)
  window.removeEventListener('pointerup', endWindowDrag)
  window.removeEventListener('pointercancel', endWindowDrag)
  dragBlur = null
  clampRect()
}

function startDrag(kind, e) {
  if (e.button !== 0 || busy.value) return
  e.preventDefault()
  e.stopPropagation()
  if (dragBlur) endWindowDrag()
  dragBlur = {
    kind,
    sx: e.clientX,
    sy: e.clientY,
    l: leftPct.value,
    t: topPct.value,
    w: widthPct.value,
    h: heightPct.value,
  }
  window.addEventListener('pointermove', onWindowMove)
  window.addEventListener('pointerup', endWindowDrag)
  window.addEventListener('pointercancel', endWindowDrag)
}

function outputMime() {
  return currentFile?.type?.includes('jpeg') || currentFile?.type?.includes('jpg')
    ? 'image/jpeg'
    : 'image/png'
}

async function renderBlurCanvas() {
  if (!currentFile) return null
  const url = URL.createObjectURL(currentFile)
  const img = await loadImage(url)
  URL.revokeObjectURL(url)

  const w = img.naturalWidth
  const h = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  clampRect()
  let rx = Math.round((leftPct.value / 100) * w)
  let ry = Math.round((topPct.value / 100) * h)
  let rw = Math.round((widthPct.value / 100) * w)
  let rh = Math.round((heightPct.value / 100) * h)

  rx = Math.max(0, Math.min(w - 1, rx))
  ry = Math.max(0, Math.min(h - 1, ry))
  rw = Math.max(1, Math.min(w - rx, rw))
  rh = Math.max(1, Math.min(h - ry, rh))

  canvasRGBA(canvas, rx, ry, rw, rh, radius.value)
  return canvas
}

async function openPreview() {
  if (!currentFile) {
    ElMessage.warning(t('msg.selectImageFirst'))
    return
  }
  busy.value = true
  try {
    const canvas = await renderBlurCanvas()
    if (!canvas) return
    const mime = outputMime()
    const blob = await canvasToBlob(
      canvas,
      mime === 'image/jpeg' ? 'image/jpeg' : 'image/png',
      mime === 'image/jpeg' ? 0.92 : undefined
    )
    if (!blob) throw new Error('export')
    revokePreviewObject()
    previewObjectUrl = URL.createObjectURL(blob)
    previewUrl.value = previewObjectUrl
    previewVisible.value = true
  } catch (e) {
    console.error(e)
    ElMessage.error(t('msg.processFail'))
  } finally {
    busy.value = false
  }
}

async function process() {
  if (!currentFile) {
    ElMessage.warning(t('msg.selectImageFirst'))
    return
  }
  busy.value = true
  try {
    const canvas = await renderBlurCanvas()
    if (!canvas) return
    const mime = outputMime()
    const blob = await canvasToBlob(
      canvas,
      mime === 'image/jpeg' ? 'image/jpeg' : 'image/png',
      mime === 'image/jpeg' ? 0.92 : undefined
    )
    if (!blob) throw new Error('export')

    const ext = mime === 'image/jpeg' ? 'jpg' : 'png'
    downloadBlob(blob, `${fileBaseName(currentFile)}-blurred.${ext}`)
    ElMessage.success(t('msg.downloaded'))
  } catch (e) {
    console.error(e)
    ElMessage.error(t('msg.processFail'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="tool-page">
    <h1>{{ tp('h1') }}</h1>
    <p class="lead">{{ tp('lead') }}</p>

    <el-card class="tool-card">
      <ImagePicker hide-preview :disabled="busy" @file="onFile" />
    </el-card>

    <el-card v-if="imageUrl" class="tool-card blur-preview-card">
      <div class="preview-size-row">
        <span class="preview-size-label">{{ tp('previewSize') }}</span>
        <el-slider
          v-model="previewZoom"
          :min="10"
          :max="200"
          :step="5"
          :disabled="busy"
          :format-tooltip="(v) => v + '%'"
          class="preview-size-slider"
        />
      </div>
      <p class="blur-hint">{{ tp('regionHint') }}</p>
      <div class="tool-preview-frame">
        <div ref="stageRef" class="blur-stage">
          <img
            :src="imageUrl"
            class="blur-img"
            alt=""
            draggable="false"
            :style="previewMaxHeightStyle"
            @load="onImgLoad"
          />
        <div class="blur-overlay">
          <div
            class="blur-rect"
            :style="{
              left: leftPct + '%',
              top: topPct + '%',
              width: widthPct + '%',
              height: heightPct + '%',
            }"
            @pointerdown="startDrag('move', $event)"
          >
            <span class="blur-rect-label">{{ tp('blurArea') }}</span>
            <button
              type="button"
              class="blur-handle blur-handle-nw"
              aria-label="nw"
              @pointerdown.stop="startDrag('nw', $event)"
            />
            <button
              type="button"
              class="blur-handle blur-handle-ne"
              aria-label="ne"
              @pointerdown.stop="startDrag('ne', $event)"
            />
            <button
              type="button"
              class="blur-handle blur-handle-sw"
              aria-label="sw"
              @pointerdown.stop="startDrag('sw', $event)"
            />
            <button
              type="button"
              class="blur-handle blur-handle-se"
              aria-label="se"
              @pointerdown.stop="startDrag('se', $event)"
            />
          </div>
        </div>
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="previewVisible"
      :title="tp('previewTitle')"
      class="blur-preview-dialog"
      width="min(920px, 94vw)"
      align-center
      append-to-body
      destroy-on-close
      @closed="onPreviewDialogClosed"
    >
      <img v-if="previewUrl" :src="previewUrl" class="blur-preview-dialog-img" alt="" />
    </el-dialog>

    <el-card class="tool-card">
      <el-form label-width="120px" label-position="left">
        <el-form-item :label="tp('radius')">
          <el-slider v-model="radius" :min="1" :max="40" show-input :disabled="busy" />
        </el-form-item>
        <el-form-item>
          <ToolProgressBar :visible="busy" />
          <el-button :disabled="busy" @click="openPreview">{{ tp('preview') }}</el-button>
          <el-button type="primary" :disabled="busy" @click="process">{{ tp('action') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.blur-preview-card {
  overflow: hidden;
}

.preview-size-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin-bottom: 12px;
}

.preview-size-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
}

.preview-size-slider {
  flex: 1;
  min-width: 160px;
  max-width: 320px;
}

.tool-preview-frame {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 100%;
  overflow: auto;
  max-height: calc(100dvh - 120px);
}

.blur-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.blur-stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  vertical-align: top;
}

.blur-img {
  display: block;
  object-fit: contain;
  user-select: none;
  vertical-align: top;
}

.blur-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.blur-rect {
  position: absolute;
  box-sizing: border-box;
  border: 2px dashed var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  pointer-events: auto;
  cursor: move;
  touch-action: none;
  min-width: 24px;
  min-height: 24px;
}

.blur-rect-label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: var(--el-color-primary);
  pointer-events: none;
  text-shadow: 0 0 4px var(--el-bg-color);
  white-space: nowrap;
}

.blur-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  padding: 0;
  border: 2px solid var(--el-color-primary);
  background: var(--el-bg-color);
  border-radius: 2px;
  cursor: nwse-resize;
  pointer-events: auto;
  box-sizing: border-box;
  touch-action: none;
}

.blur-handle-nw {
  left: -7px;
  top: -7px;
  cursor: nwse-resize;
}

.blur-handle-ne {
  right: -7px;
  top: -7px;
  cursor: nesw-resize;
}

.blur-handle-sw {
  left: -7px;
  bottom: -7px;
  cursor: nesw-resize;
}

.blur-handle-se {
  right: -7px;
  bottom: -7px;
  cursor: nwse-resize;
}
</style>

<style>
.blur-preview-dialog .el-dialog__body {
  padding-top: 8px;
  text-align: center;
  overflow: auto;
  max-height: min(78vh, calc(100dvh - 140px));
}

.blur-preview-dialog-img {
  display: inline-block;
  max-width: 100%;
  max-height: min(72vh, calc(100dvh - 200px));
  width: auto;
  height: auto;
  object-fit: contain;
  vertical-align: top;
}
</style>
