<script setup>
import { ref, nextTick, unref, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Odometer } from '@element-plus/icons-vue'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'

const { t, tp } = usePageI18n('rotate')
const pickerRef = ref(null)
const busy = ref(false)
const imageUrl = ref('')
const rotateDialogVisible = ref(false)
/** 旋转角（度），与 canvas 正角度一致（顺时针） */
const angleDeg = ref(0)
const knobRef = ref(null)
let knobDragging = false

let currentFile = null

function normalizeDeg(d) {
  const x = d % 360
  return x < 0 ? x + 360 : x
}

function angleFromClient(clientX, clientY, el) {
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const dx = clientX - cx
  const dy = clientY - cy
  const rad = Math.atan2(dx, -dy)
  return normalizeDeg((rad * 180) / Math.PI)
}

function onKnobPointerDown(e) {
  if (e.button !== 0) return
  const el = e.currentTarget
  el.setPointerCapture(e.pointerId)
  knobDragging = true
  angleDeg.value = angleFromClient(e.clientX, e.clientY, el)
  e.preventDefault()
}

function onKnobPointerMove(e) {
  if (!knobDragging || !knobRef.value) return
  angleDeg.value = angleFromClient(e.clientX, e.clientY, knobRef.value)
}

function onKnobPointerUp(e) {
  if (!knobDragging) return
  knobDragging = false
  try {
    e.currentTarget?.releasePointerCapture?.(e.pointerId)
  } catch {
    /* ignore */
  }
}

function snapPreset(deg) {
  angleDeg.value = normalizeDeg(deg)
}

function openRotateDialog() {
  const url = unref(pickerRef.value?.previewUrl)
  if (!url || !currentFile) return
  imageUrl.value = url
  angleDeg.value = 0
  rotateDialogVisible.value = true
}

function onRotateDialogOpened() {
  angleDeg.value = 0
}

function onRotateDialogClosed() {
  imageUrl.value = ''
}

async function onFile(file) {
  currentFile = file
  if (!file) {
    imageUrl.value = ''
    rotateDialogVisible.value = false
    return
  }
  await nextTick()
  const url = unref(pickerRef.value?.previewUrl)
  imageUrl.value = typeof url === 'string' ? url : ''
  await nextTick()
  angleDeg.value = 0
  rotateDialogVisible.value = true
}

onBeforeUnmount(() => {
  knobDragging = false
})

function rotateCanvas(sourceCanvas, deg) {
  const rad = (deg * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const nw = Math.round(w * cos + h * sin)
  const nh = Math.round(w * sin + h * cos)
  const canvas = document.createElement('canvas')
  canvas.width = nw
  canvas.height = nh
  const ctx = canvas.getContext('2d')
  ctx.translate(nw / 2, nh / 2)
  ctx.rotate(rad)
  ctx.drawImage(sourceCanvas, -w / 2, -h / 2)
  return canvas
}

async function process() {
  if (!currentFile) {
    ElMessage.warning(t('msg.selectImageFirst'))
    return
  }
  busy.value = true
  try {
    const url = URL.createObjectURL(currentFile)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)

    const c0 = document.createElement('canvas')
    c0.width = img.naturalWidth
    c0.height = img.naturalHeight
    c0.getContext('2d').drawImage(img, 0, 0)

    const deg = normalizeDeg(angleDeg.value)
    const out = deg < 0.0001 || deg > 360 - 0.0001 ? c0 : rotateCanvas(c0, deg)

    const mime =
      currentFile.type?.includes('jpeg') || currentFile.type?.includes('jpg')
        ? 'image/jpeg'
        : currentFile.type?.includes('png')
          ? 'image/png'
          : 'image/png'
    const blob = await canvasToBlob(
      out,
      mime === 'image/jpeg' ? 'image/jpeg' : 'image/png',
      mime === 'image/jpeg' ? 0.92 : undefined
    )
    if (!blob) throw new Error('export')

    const ext = mime === 'image/jpeg' ? 'jpg' : 'png'
    downloadBlob(blob, `${fileBaseName(currentFile)}-rotated.${ext}`)
    ElMessage.success(t('msg.downloaded'))
  } catch (e) {
    console.error(e)
    ElMessage.error(t('msg.rotateFail'))
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
      <ImagePicker ref="pickerRef" hide-preview :disabled="busy" @file="onFile" />
      <div v-if="currentFile && !rotateDialogVisible" class="rotate-reopen-row">
        <el-button type="primary" link @click="openRotateDialog">{{ tp('reopenRotate') }}</el-button>
      </div>
    </el-card>

    <el-dialog
      v-model="rotateDialogVisible"
      :title="tp('dialogTitle')"
      class="rotate-dialog"
      width="min(920px, 94vw)"
      align-center
      append-to-body
      destroy-on-close
      @opened="onRotateDialogOpened"
      @closed="onRotateDialogClosed"
    >
      <div class="rotate-dialog-inner">
        <div class="rotate-preview">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            :alt="tp('previewAlt')"
            class="rotate-preview-img"
            :style="{ transform: `rotate(${angleDeg}deg)` }"
          />
        </div>

        <p class="rotate-knob-hint">{{ tp('knobHint') }}</p>

        <div class="rotate-controls-actions">
          <div class="actions">
            <ToolProgressBar :visible="busy" />
            <el-button type="primary" :disabled="busy" @click="process">{{ tp('action') }}</el-button>
          </div>

          <div class="rotate-controls">
            <div
              ref="knobRef"
              class="angle-knob"
              :class="{ 'is-dragging': knobDragging }"
              role="slider"
              :aria-valuenow="Math.round(angleDeg)"
              aria-valuemin="0"
              aria-valuemax="359"
              :aria-label="tp('knobAria')"
              @pointerdown="onKnobPointerDown"
              @pointermove="onKnobPointerMove"
              @pointerup="onKnobPointerUp"
              @pointercancel="onKnobPointerUp"
            >
              <svg class="angle-knob-svg" viewBox="0 0 100 100" aria-hidden="true">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="var(--el-fill-color-light)"
                  stroke="var(--el-border-color)"
                  stroke-width="2"
                />
                <g
                  v-for="n in 12"
                  :key="n"
                  :transform="`rotate(${(n - 1) * 30} 50 50)`"
                >
                  <line x1="50" y1="10" x2="50" y2="16" stroke="var(--el-border-color-darker)" stroke-width="1.5" />
                </g>
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="18"
                  stroke="var(--el-color-primary)"
                  stroke-width="3.5"
                  stroke-linecap="round"
                  :transform="`rotate(${angleDeg} 50 50)`"
                />
                <circle cx="50" cy="50" r="18" fill="var(--el-bg-color)" stroke="var(--el-border-color-lighter)" />
              </svg>
              <div class="angle-knob-icon-floated">
                <!-- 直接挂在 SVG 上定宽高：el-icon 的 size 在弹窗内易被继承样式覆盖 -->
                <Odometer class="angle-knob-center-icon" />
              </div>
            </div>

            <div class="rotate-side">
              <div class="angle-readout" aria-live="polite">
                <span class="angle-readout-value">{{ Math.round(angleDeg) }}</span>
                <span class="angle-readout-unit">°</span>
              </div>
              <div class="preset-angles">
                <span class="preset-label">{{ tp('presetQuick') }}</span>
                <el-button size="small" :disabled="busy" @click="snapPreset(90)">90°</el-button>
                <el-button size="small" :disabled="busy" @click="snapPreset(180)">180°</el-button>
                <el-button size="small" :disabled="busy" @click="snapPreset(270)">270°</el-button>
                <el-button size="small" text :disabled="busy" @click="snapPreset(0)">{{ tp('resetAngle') }}</el-button>
                <div class="preset-custom-angle">
                  <span class="preset-custom-angle-label">{{ tp('customAngleLabel') }}</span>
                  <el-input-number
                    v-model="angleDeg"
                    :min="0"
                    :max="360"
                    :step="1"
                    :precision="0"
                    :disabled="busy"
                    controls-position="right"
                    class="preset-angle-input"
                  />
                  <span class="preset-custom-angle-unit">°</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.rotate-reopen-row {
  margin-top: 12px;
}

.rotate-dialog-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.rotate-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: min(48vh, 420px);
  min-height: min(42vh, 360px);
  max-height: min(48vh, 420px);
  overflow: hidden;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
}

.rotate-preview-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  transform-origin: center center;
  will-change: transform;
}

.rotate-knob-hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.rotate-controls-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
  width: 100%;
}

.rotate-controls {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 24px 32px;
}

.rotate-controls-actions .actions {
  flex-shrink: 0;
}

.angle-knob {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
  border-radius: 50%;
}

.angle-knob.is-dragging {
  cursor: grabbing;
}

.angle-knob-svg {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.angle-knob-icon-floated {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  color: var(--el-text-color-regular);
  line-height: 0;
}

/* 明确像素尺寸，避免 .el-dialog 等处的 font-size 影响 1em 图标 */
.angle-knob-center-icon {
  display: block;
  width: 28px;
  height: 28px;
}

.rotate-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.angle-readout {
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.angle-readout-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.angle-readout-unit {
  font-size: 18px;
  color: var(--el-text-color-secondary);
  margin-left: 2px;
}

.preset-angles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.preset-label {
  width: 100%;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.preset-custom-angle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
}

.preset-custom-angle-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.preset-custom-angle-unit {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.preset-angle-input {
  width: 128px;
  max-width: 100%;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>

<style>
.rotate-dialog .el-dialog__body {
  overflow: hidden !important;
  padding-top: 8px;
}
</style>
