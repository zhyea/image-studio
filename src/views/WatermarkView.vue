<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'
import {
  WATERMARK_FONTS,
  DEFAULT_WATERMARK_FONT_ID,
  getWatermarkFontById,
  WATERMARK_GOOGLE_FONTS_STYLESHEET,
} from '../constants/watermarkFonts'
import {
  WM_SEL_CHROME_PAD_X,
  WM_SEL_CHROME_PAD_Y,
  WM_LINE_HEIGHT_RATIO,
  WM_DEFAULT_BOX_W,
  WM_BASE_FONT_SIZE,
  WM_MIN_TEXTAREA_W,
  WM_BOX_MIN_W,
  WM_BOX_MAX_W,
  WM_BOX_MAX_H,
} from '../constants/watermarkLayout'
import { useImageProcess } from '../composables/useImageProcess'

const WM_FONTS_LINK_ID = 'wm-open-fonts-css'

function ensureWatermarkGoogleFonts() {
  if (typeof document === 'undefined') return
  if (document.getElementById(WM_FONTS_LINK_ID)) return
  const head = document.head
  const preG = document.createElement('link')
  preG.rel = 'preconnect'
  preG.href = 'https://fonts.googleapis.com'
  const preS = document.createElement('link')
  preS.rel = 'preconnect'
  preS.href = 'https://fonts.gstatic.com'
  preS.crossOrigin = 'anonymous'
  const css = document.createElement('link')
  css.id = WM_FONTS_LINK_ID
  css.rel = 'stylesheet'
  css.href = WATERMARK_GOOGLE_FONTS_STYLESHEET
  head.append(preG, preS, css)
}

const { t, locale } = useI18n()
const { tp } = usePageI18n('watermark')
const { busy, run } = useImageProcess()
const previewVisible = ref(false)
const previewUrl = ref('')
const previewZoom = ref(100)
/** 视口内预览区高度上限（px），resize 时更新 */
const winCapPx = ref(420)
let previewObjectUrl = null

const text = ref('')
/** 类 Fireworks：默认紧凑摘要，双击或「编辑文字」再展开多行输入 */
const editingText = ref(false)
const textEditRef = ref(null)
const fontSize = ref(24)
const fontFamilyId = ref(DEFAULT_WATERMARK_FONT_ID)
const opacity = ref(0.45)
const color = ref('#ffffff')
const imageUrl = ref('')
const stageRef = ref(null)
const floatRef = ref(null)
const stageSize = ref({ w: 0, h: 0 })
/** 水印框左上角相对预览区比例 0~1 */
const anchorNorm = ref({ x: 0.62, y: 0.72 })
/** wm-sel border 2px + padding 左右 8+10、上下 8+10（详见 constants/watermarkLayout） */
const selChromePadX = WM_SEL_CHROME_PAD_X
const selChromePadY = WM_SEL_CHROME_PAD_Y
/** 预览区水印框尺寸（px），仅影响编辑区域与导出位置无关；字号仅由 fontSize 控制 */
const boxW = ref(WM_DEFAULT_BOX_W)
/** 默认高度 = 一行字高 + 选区 chrome */
const boxH = ref(Math.round(WM_BASE_FONT_SIZE * WM_LINE_HEIGHT_RATIO) + selChromePadY)

let currentFile = null
let objectUrl = null
let ro = null
/** @type {ResizeObserver | null} */
let textareaRo = null

let dragWM = null
/** @type {{ corner: string, pid: number, fixL: number, fixT: number, fixR: number, fixB: number } | null} */
let resizeWM = null

function detachRo() {
  if (ro) {
    ro.disconnect()
    ro = null
  }
}

function attachRo() {
  detachRo()
  const el = stageRef.value
  if (!el) return
  ro = new ResizeObserver(() => {
    updateStageSize()
    clampAnchor()
  })
  ro.observe(el)
}

watch(text, () => {
  nextTick(() => clampAnchor())
})

watch(fontSize, () => {
  preloadWatermarkFont(fontSize.value)
  nextTick(() => {
    if (editingText.value) autosizeWatermarkTextarea()
    clampAnchor()
  })
})

const activeWmFont = computed(() => getWatermarkFontById(fontFamilyId.value))

watch(fontFamilyId, () => {
  preloadWatermarkFont(fontSize.value)
  nextTick(() => {
    if (editingText.value) autosizeWatermarkTextarea()
    clampAnchor()
  })
})

function preloadWatermarkFont(sizePx) {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  const fam = activeWmFont.value.family
  document.fonts.load(`700 ${sizePx}px ${fam}`).catch(() => {})
}

async function ensureWatermarkFontForCanvas(sizePx) {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  const fam = activeWmFont.value.family
  try {
    await document.fonts.load(`700 ${sizePx}px ${fam}`)
    await document.fonts.ready
  } catch {
    /* 仍尝试绘制，浏览器会回退 */
  }
}

const showCompactCaret = computed(() => !editingText.value && !text.value.trim())

const wmTextareaStyle = computed(() => {
  const lh = Math.round(fontSize.value * WM_LINE_HEIGHT_RATIO)
  const iw = Math.max(WM_MIN_TEXTAREA_W, boxW.value - selChromePadX)
  /** 至少一行；若用户拖过选区手柄则不低于当前框内高 */
  const ih = Math.max(lh, boxH.value - selChromePadY)
  return {
    width: `${iw}px`,
    minHeight: `${ih}px`,
    boxSizing: 'border-box',
    fontSize: `${fontSize.value}px`,
    lineHeight: `${lh}px`,
    fontWeight: '700',
    caretColor: color.value,
    color: color.value,
    opacity: String(opacity.value),
    padding: '0',
    margin: '0',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    background: 'transparent',
    textShadow: '0 0 2px rgba(0,0,0,.65), 0 1px 3px rgba(0,0,0,.45)',
    fontFamily: activeWmFont.value.family,
  }
})

const selBoxStyle = computed(() => ({
  width: `${boxW.value}px`,
  minHeight: `${boxH.value}px`,
}))

/** 预览区文字与导出一致的字号 / 行高 */
const snippetTextStyle = computed(() => {
  const fs = fontSize.value
  const lh = Math.round(fs * 1.25)
  return {
    color: color.value,
    opacity: String(opacity.value),
    fontSize: `${fs}px`,
    lineHeight: `${lh}px`,
    fontFamily: activeWmFont.value.family,
  }
})

function startTextEdit() {
  if (busy.value) return
  editingText.value = true
}

function onCompactAreaClick() {
  if (!text.value.trim()) startTextEdit()
}

function finishTextEdit() {
  editingText.value = false
}

function revokeUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
}

function updateStageSize() {
  const el = stageRef.value
  if (!el) return
  stageSize.value = { w: el.clientWidth, h: el.clientHeight }
}

function clampAnchor() {
  const sw = Math.max(1, stageSize.value.w)
  const sh = Math.max(1, stageSize.value.h)
  const fr = floatRef.value
  const bw = fr?.offsetWidth ?? boxW.value
  const bh = fr?.offsetHeight ?? boxH.value
  /** 允许水印框超出图片范围（预览区仍可滚动查看） */
  const padX = Math.max(64, Math.round(sw * 0.55))
  const padY = Math.max(64, Math.round(sh * 0.55))
  const minX = (-padX) / sw
  const minY = (-padY) / sh
  const maxX = (sw - bw + padX) / sw
  const maxY = (sh - bh + padY) / sh
  anchorNorm.value = {
    x: Math.min(Math.max(anchorNorm.value.x, minX), maxX),
    y: Math.min(Math.max(anchorNorm.value.y, minY), maxY),
  }
}

const floatStyleObj = computed(() => {
  const sw = Math.max(1, stageSize.value.w)
  const sh = Math.max(1, stageSize.value.h)
  return {
    left: `${anchorNorm.value.x * sw}px`,
    top: `${anchorNorm.value.y * sh}px`,
  }
})

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

function stageLocalFromClient(clientX, clientY) {
  const st = stageRef.value?.getBoundingClientRect()
  if (!st) return { x: 0, y: 0 }
  return { x: clientX - st.left, y: clientY - st.top }
}

function onWmMovePointerDown(e) {
  if (e.button !== 0 || busy.value) return
  if (e.target instanceof Element && e.target.closest('.wm-compact-body, .wm-float-input, textarea')) return
  finishTextEdit()
  const el = e.currentTarget
  el.setPointerCapture(e.pointerId)
  dragWM = {
    pid: e.pointerId,
    sx: e.clientX,
    sy: e.clientY,
    ax: anchorNorm.value.x,
    ay: anchorNorm.value.y,
  }
  e.preventDefault()
}

function onWmMovePointerMove(e) {
  if (!dragWM || e.pointerId !== dragWM.pid) return
  const sw = Math.max(1, stageSize.value.w)
  const sh = Math.max(1, stageSize.value.h)
  const dx = (e.clientX - dragWM.sx) / sw
  const dy = (e.clientY - dragWM.sy) / sh
  anchorNorm.value = { x: dragWM.ax + dx, y: dragWM.ay + dy }
  nextTick(() => clampAnchor())
}

function onWmMovePointerUp(e) {
  if (!dragWM || e.pointerId !== dragWM.pid) return
  try {
    e.currentTarget?.releasePointerCapture?.(e.pointerId)
  } catch {
    /* ignore */
  }
  dragWM = null
  clampAnchor()
}

function watermarkMinBoxH() {
  return Math.round(fontSize.value * WM_LINE_HEIGHT_RATIO) + selChromePadY
}

function clampBoxSize(w, h) {
  const minW = WM_BOX_MIN_W
  const minH = watermarkMinBoxH()
  const maxW = WM_BOX_MAX_W
  const maxH = WM_BOX_MAX_H
  return {
    w: Math.min(maxW, Math.max(minW, Math.round(w))),
    h: Math.min(maxH, Math.max(minH, Math.round(h))),
  }
}

function onCornerPointerDown(corner, e) {
  if (e.button !== 0 || busy.value) return
  e.stopPropagation()
  const fr = floatRef.value?.getBoundingClientRect()
  const st = stageRef.value?.getBoundingClientRect()
  if (!fr || !st) return
  const fixL = fr.left - st.left
  const fixT = fr.top - st.top
  const fixR = fr.right - st.left
  const fixB = fr.bottom - st.top
  const el = e.currentTarget
  el.setPointerCapture(e.pointerId)
  resizeWM = { corner, pid: e.pointerId, fixL, fixT, fixR, fixB }
  e.preventDefault()
}

function onCornerPointerMove(e) {
  if (!resizeWM || e.pointerId !== resizeWM.pid) return
  const { x: px, y: py } = stageLocalFromClient(e.clientX, e.clientY)
  const { corner, fixL, fixT, fixR, fixB } = resizeWM
  const sw = Math.max(1, stageSize.value.w)
  const sh = Math.max(1, stageSize.value.h)
  let w
  let h
  if (corner === 'se') {
    w = px - fixL
    h = py - fixT
  } else if (corner === 'nw') {
    w = fixR - px
    h = fixB - py
  } else if (corner === 'ne') {
    w = px - fixL
    h = fixB - py
  } else if (corner === 'sw') {
    w = fixR - px
    h = py - fixT
  } else {
    return
  }
  const c = clampBoxSize(w, h)
  w = c.w
  h = c.h
  if (corner === 'nw') {
    anchorNorm.value = { x: (fixR - w) / sw, y: (fixB - h) / sh }
  } else if (corner === 'ne') {
    anchorNorm.value = { x: fixL / sw, y: (fixB - h) / sh }
  } else if (corner === 'sw') {
    anchorNorm.value = { x: (fixR - w) / sw, y: fixT / sh }
  }
  boxW.value = w
  boxH.value = h
  nextTick(() => clampAnchor())
}

function onCornerPointerUp(e) {
  if (!resizeWM || e.pointerId !== resizeWM.pid) return
  try {
    e.currentTarget?.releasePointerCapture?.(e.pointerId)
  } catch {
    /* ignore */
  }
  resizeWM = null
  clampAnchor()
}

function onImgLoad() {
  nextTick(() => {
    updateWinCapPx()
    updateStageSize()
    attachRo()
    clampAnchor()
  })
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

onMounted(() => {
  ensureWatermarkGoogleFonts()
  updateWinCapPx()
  window.addEventListener('resize', updateWinCapPx)
  preloadWatermarkFont(fontSize.value)
})

function detachTextareaRo() {
  if (textareaRo) {
    textareaRo.disconnect()
    textareaRo = null
  }
}

function autosizeWatermarkTextarea() {
  if (!editingText.value || resizeWM) return
  const inst = textEditRef.value
  const ta = inst?.$el?.querySelector?.('textarea')
  if (!ta) return
  const lh = Math.round(fontSize.value * WM_LINE_HEIGHT_RATIO)
  const innerMin = Math.max(lh, boxH.value - selChromePadY)
  ta.style.overflowY = 'hidden'
  ta.style.height = '0px'
  const nextH = Math.max(innerMin, ta.scrollHeight)
  ta.style.height = `${nextH}px`
  nextTick(() => syncBoxFromTextarea())
}

function onWatermarkTextInput() {
  nextTick(() => autosizeWatermarkTextarea())
}

function syncBoxFromTextarea() {
  if (resizeWM) return
  const inst = textEditRef.value
  const ta = inst?.$el?.querySelector?.('textarea')
  if (!ta) return
  const nw = Math.round(ta.offsetWidth + selChromePadX)
  const nh = Math.round(ta.offsetHeight + selChromePadY)
  if (Math.abs(nw - boxW.value) <= 1 && Math.abs(nh - boxH.value) <= 1) return
  boxW.value = nw
  boxH.value = nh
  nextTick(() => clampAnchor())
}

function attachTextareaRo() {
  detachTextareaRo()
  const inst = textEditRef.value
  const ta = inst?.$el?.querySelector?.('textarea')
  if (!ta) return
  textareaRo = new ResizeObserver(() => {
    syncBoxFromTextarea()
  })
  textareaRo.observe(ta)
}

watch(editingText, (v) => {
  if (v) {
    nextTick(() => {
      const inst = textEditRef.value
      if (typeof inst?.focus === 'function') {
        inst.focus()
      } else {
        inst?.$el?.querySelector?.('textarea')?.focus?.()
      }
      attachTextareaRo()
      nextTick(() => autosizeWatermarkTextarea())
    })
  } else {
    detachTextareaRo()
    nextTick(() => clampAnchor())
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWinCapPx)
  detachRo()
  detachTextareaRo()
  revokeUrl()
  revokePreviewObject()
})

function drawWatermarkText(ctx, natW, natH) {
  ctx.save()
  ctx.globalAlpha = opacity.value
  ctx.fillStyle = color.value
  ctx.font = `bold ${fontSize.value}px ${activeWmFont.value.family}`
  ctx.textBaseline = 'top'
  const lines = (text.value || ' ').split(/\n/)
  const lh = fontSize.value * 1.25
  const tx = anchorNorm.value.x * natW
  const ty = anchorNorm.value.y * natH
  const lw = Math.max(2, fontSize.value / 12)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = lw
  lines.forEach((line, i) => {
    const y = ty + i * lh
    ctx.strokeText(line || ' ', tx, y)
    ctx.fillText(line || ' ', tx, y)
  })
  ctx.restore()
}

async function renderWatermarkCanvas() {
  if (!currentFile) return null
  const url = URL.createObjectURL(currentFile)
  const img = await loadImage(url)
  URL.revokeObjectURL(url)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  await ensureWatermarkFontForCanvas(fontSize.value)
  drawWatermarkText(ctx, canvas.width, canvas.height)
  return canvas
}

async function openPreview() {
  if (!currentFile) {
    ElMessage.warning(t('msg.selectImageFirst'))
    return
  }
  if (!text.value.trim()) {
    ElMessage.warning(t('msg.enterWatermark'))
    return
  }
  await run(async () => {
    const canvas = await renderWatermarkCanvas()
    if (!canvas) return
    const blob = await canvasToBlob(canvas, 'image/png')
    if (!blob) throw new Error('export')
    revokePreviewObject()
    previewObjectUrl = URL.createObjectURL(blob)
    previewUrl.value = previewObjectUrl
    previewVisible.value = true
  }, { errorMsg: t('msg.processFail') })
}

async function process() {
  if (!currentFile) {
    ElMessage.warning(t('msg.selectImageFirst'))
    return
  }
  if (!text.value.trim()) {
    ElMessage.warning(t('msg.enterWatermark'))
    return
  }
  await run(async () => {
    const canvas = await renderWatermarkCanvas()
    if (!canvas) return
    const blob = await canvasToBlob(canvas, 'image/png')
    if (!blob) throw new Error('export')
    downloadBlob(blob, `${fileBaseName(currentFile)}-watermark.png`)
    ElMessage.success(t('msg.downloaded'))
  }, { errorMsg: t('msg.processFail') })
}
</script>

<template>
  <div class="tool-page">
    <h1>{{ tp('h1') }}</h1>
    <p class="lead">{{ tp('lead') }}</p>

    <el-card class="tool-card">
      <ImagePicker hide-preview :disabled="busy" @file="onFile" />
    </el-card>

    <el-card v-if="imageUrl" class="tool-card wm-preview-card">
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
      <p class="wm-hint">{{ tp('dragHint') }}</p>
      <div class="tool-preview-frame">
        <div ref="stageRef" class="wm-stage">
          <img
            :src="imageUrl"
            class="wm-img"
            alt=""
            draggable="false"
            :style="previewMaxHeightStyle"
            @load="onImgLoad"
          />
        <div class="wm-overlay">
          <div
            ref="floatRef"
            class="wm-float"
            :class="{ 'wm-float--editing': editingText }"
            :style="floatStyleObj"
          >
            <div
              class="wm-sel"
              :class="{ 'wm-sel--editing': editingText }"
              :style="selBoxStyle"
              :title="tp('dragHandle')"
              @pointerdown="onWmMovePointerDown"
              @pointermove="onWmMovePointerMove"
              @pointerup="onWmMovePointerUp"
              @pointercancel="onWmMovePointerUp"
            >
              <span
                class="wm-handle wm-handle--nw"
                :aria-label="tp('resizeHandle')"
                @pointerdown.stop="onCornerPointerDown('nw', $event)"
                @pointermove="onCornerPointerMove"
                @pointerup="onCornerPointerUp"
                @pointercancel="onCornerPointerUp"
              />
              <span
                class="wm-handle wm-handle--ne"
                :aria-label="tp('resizeHandle')"
                @pointerdown.stop="onCornerPointerDown('ne', $event)"
                @pointermove="onCornerPointerMove"
                @pointerup="onCornerPointerUp"
                @pointercancel="onCornerPointerUp"
              />
              <span
                class="wm-handle wm-handle--sw"
                :aria-label="tp('resizeHandle')"
                @pointerdown.stop="onCornerPointerDown('sw', $event)"
                @pointermove="onCornerPointerMove"
                @pointerup="onCornerPointerUp"
                @pointercancel="onCornerPointerUp"
              />
              <span
                class="wm-handle wm-handle--se"
                :aria-label="tp('resizeHandle')"
                @pointerdown.stop="onCornerPointerDown('se', $event)"
                @pointermove="onCornerPointerMove"
                @pointerup="onCornerPointerUp"
                @pointercancel="onCornerPointerUp"
              />
              <div class="wm-sel-inner" :class="{ 'wm-sel-inner--editing': editingText }">
                <div
                  v-if="!editingText"
                  class="wm-compact-body"
                  @dblclick.stop="startTextEdit"
                  @click.stop="onCompactAreaClick"
                >
                  <template v-if="showCompactCaret">
                    <span
                      class="wm-caret-line"
                      :style="snippetTextStyle"
                      aria-hidden="true"
                    >
                      <span class="wm-caret-blink" />
                    </span>
                  </template>
                  <span v-else class="wm-text-snippet" :style="snippetTextStyle">{{ text }}</span>
                </div>
                <el-input
                  v-else
                  ref="textEditRef"
                  v-model="text"
                  type="textarea"
                  resize="horizontal"
                  :disabled="busy"
                  :input-style="wmTextareaStyle"
                  class="wm-float-input"
                  @blur="finishTextEdit"
                  @input="onWatermarkTextInput"
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </el-card>

    <el-dialog
      v-model="previewVisible"
      :title="tp('previewTitle')"
      class="wm-preview-dialog"
      width="min(920px, 94vw)"
      align-center
      append-to-body
      destroy-on-close
      @closed="onPreviewDialogClosed"
    >
      <img v-if="previewUrl" :src="previewUrl" class="wm-preview-dialog-img" alt="" />
    </el-dialog>

    <el-card class="tool-card" :class="{ 'wm-form-sliders-paused': editingText && !!imageUrl }">
      <el-form label-width="100px" label-position="left">
        <el-form-item :label="tp('fontFamily')">
          <div class="wm-font-field">
            <el-select
              v-model="fontFamilyId"
              :disabled="busy"
              class="wm-font-select"
              :teleported="true"
            >
              <el-option
                v-for="f in WATERMARK_FONTS"
                :key="f.id"
                :label="tp(f.labelKey)"
                :value="f.id"
              >
                <div class="wm-font-option">
                  <span>{{ tp(f.labelKey) }}</span>
                  <span class="wm-font-option-lic">{{ f.license }}</span>
                </div>
              </el-option>
            </el-select>
            <p class="wm-font-note">{{ tp('fontLicenseNote') }}</p>
          </div>
        </el-form-item>
        <el-form-item :label="tp('fontSize')">
          <el-slider v-model="fontSize" :min="12" :max="120" show-input :disabled="busy" />
        </el-form-item>
        <el-form-item :label="tp('opacity')">
          <el-slider v-model="opacity" :min="0.1" :max="1" :step="0.05" show-input :disabled="busy" />
        </el-form-item>
        <el-form-item :label="tp('color')">
          <el-color-picker v-model="color" :disabled="busy" show-alpha />
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
.wm-preview-card {
  overflow: visible;
}

.wm-preview-card :deep(.el-card__body) {
  overflow: visible;
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
  /* 为超出图片边界的水印框留出可视区域，避免被滚动容器裁切 */
  padding: 72px 88px;
  box-sizing: border-box;
}

.wm-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.wm-stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  vertical-align: top;
  overflow: visible;
}

.wm-img {
  display: block;
  object-fit: contain;
  user-select: none;
  vertical-align: top;
}

.wm-overlay {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: visible;
}

.wm-float {
  position: absolute;
  pointer-events: auto;
  min-width: 0;
  max-width: none;
  overflow: visible;
  background: transparent;
  border: none;
  box-shadow: none;
}

.wm-float.wm-float--editing {
  z-index: 3;
}

/* 参考 Fireworks / 选区：细蓝框 + 透明内区 + 四角圆点手柄 */
.wm-sel {
  position: relative;
  box-sizing: border-box;
  min-width: 88px;
  max-width: none;
  padding: 8px 10px 10px;
  border: 2px solid var(--el-color-primary);
  border-radius: 1px;
  background: transparent;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.wm-sel:active {
  cursor: grabbing;
}

.wm-sel-inner {
  min-height: 0;
}

.wm-compact-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  cursor: text;
  min-height: 1.35em;
}

.wm-sel-inner--editing {
  min-height: 0;
  width: 100%;
}

.wm-sel--editing {
  cursor: text;
  padding: 6px 8px 8px;
  background: transparent;
  backdrop-filter: none;
  touch-action: auto;
}

.wm-sel--editing:active {
  cursor: text;
}

.wm-caret-line {
  display: inline-flex;
  align-items: center;
  min-height: 1em;
}

.wm-caret-blink {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  margin-left: 1px;
  background: currentColor;
  border-radius: 1px;
  animation: wm-caret-pulse 1.05s step-end infinite;
}

@keyframes wm-caret-pulse {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

.wm-handle {
  position: absolute;
  width: 11px;
  height: 11px;
  margin: -5.5px;
  box-sizing: border-box;
  background: var(--el-color-primary);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 45%, transparent);
  z-index: 2;
  pointer-events: auto;
  touch-action: none;
  cursor: nwse-resize;
}

.wm-handle--nw {
  left: 0;
  top: 0;
  cursor: nwse-resize;
}

.wm-handle--ne {
  right: 0;
  top: 0;
  cursor: nesw-resize;
}

.wm-handle--sw {
  left: 0;
  bottom: 0;
  cursor: nesw-resize;
}

.wm-handle--se {
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
}

.wm-text-snippet {
  display: block;
  font-weight: 700;
  white-space: pre-wrap;
  word-break: break-word;
  text-shadow:
    0 0 2px rgba(0, 0, 0, 0.65),
    0 1px 3px rgba(0, 0, 0, 0.45);
}

.wm-float-input {
  width: 100%;
}

.wm-float-input :deep(.el-textarea) {
  --el-input-border-color: transparent;
  --el-input-hover-border-color: transparent;
  --el-input-focus-border-color: transparent;
  box-shadow: none !important;
}

.wm-float-input :deep(.el-textarea__inner) {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  /* 高度随行数由脚本根据 scrollHeight 调整；仅允许横向拖拽改宽 */
  resize: horizontal !important;
  overflow-y: hidden !important;
  max-width: 1600px;
  max-height: min(85vh, 1000px);
  -webkit-appearance: none;
  appearance: none;
}

.wm-float-input :deep(.el-textarea__inner):focus {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

/* 编辑水印时竖直拖动 textarea 调整高度，指针经过下方会误触滑块轨道 */
.wm-form-sliders-paused :deep(.el-slider__runway) {
  pointer-events: none;
}

.wm-form-sliders-paused :deep(.el-slider .el-input-number) {
  pointer-events: auto;
}

.wm-font-field {
  width: 100%;
  max-width: 400px;
}

.wm-font-select {
  width: 100%;
}

.wm-font-note {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
}

.wm-font-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.wm-font-option-lic {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
</style>

<style>
.wm-preview-dialog .el-dialog__body {
  padding-top: 8px;
  text-align: center;
  overflow: auto;
  max-height: min(78vh, calc(100dvh - 140px));
}

.wm-preview-dialog-img {
  display: inline-block;
  max-width: 100%;
  max-height: min(72vh, calc(100dvh - 200px));
  width: auto;
  height: auto;
  object-fit: contain;
  vertical-align: top;
}
</style>
