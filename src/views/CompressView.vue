<script setup>
import { ref } from 'vue'
import { toast } from '../utils/toast'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, resizeCanvas, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'
import { useImageProcess } from '../composables/useImageProcess'

const { t, tp } = usePageI18n('compress')
const { busy, run } = useImageProcess()
const quality = ref(0.82)
const maxEdge = ref(2048)
const limitEdge = ref(true)
const format = ref('jpeg')
let currentFile = null

async function onFile(file) {
  currentFile = file
}

async function process() {
  if (!currentFile) {
    toast.warning(t('msg.selectImageFirst'))
    return
  }
  await run(async () => {
    const url = URL.createObjectURL(currentFile)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)

    let canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)

    if (limitEdge.value && maxEdge.value > 0) {
      const m = Math.max(canvas.width, canvas.height)
      if (m > maxEdge.value) {
        const s = maxEdge.value / m
        canvas = resizeCanvas(canvas, canvas.width * s, canvas.height * s)
      }
    }

    const mime = format.value === 'png' ? 'image/png' : 'image/jpeg'
    const q = format.value === 'png' ? undefined : quality.value
    const blob = await canvasToBlob(canvas, mime, q)
    if (!blob) throw new Error('export')

    const ext = format.value === 'png' ? 'png' : 'jpg'
    downloadBlob(blob, `${fileBaseName(currentFile)}-compressed.${ext}`)
    toast.success(t('msg.downloaded'))
  }, { errorMsg: t('msg.processFailRetry') })
}
</script>

<template>
  <div class="tool-page">
    <h1>{{ tp('h1') }}</h1>
    <p class="lead">{{ tp('lead') }}</p>

    <div class="tool-card">
      <ImagePicker :disabled="busy" @file="onFile" />
    </div>

    <div class="tool-card">
      <div class="u-form" style="--u-label-w: 120px">
        <div class="u-field"><label class="u-field__label">{{ tp('outputFormat') }}</label><div class="u-field__control">
          <div class="u-seg" role="radiogroup" aria-label="format">
    <label class="u-seg__item" :class="{ 'is-active': format === 'jpeg' }">
      <input type="radio" class="u-seg__input" value="jpeg" v-model.number="format" /> JPEG
    </label>
    <label class="u-seg__item" :class="{ 'is-active': format === 'png' }">
      <input type="radio" class="u-seg__input" value="png" v-model.number="format" /> PNG
    </label>
  </div>
        </div></div>
        <div class="u-field" v-if="format === 'jpeg'"><label class="u-field__label">{{ tp('jpegQuality') }}</label><div class="u-field__control">
          <div class="u-slider">
  <input type="range" v-model.number="quality" min="0.3" max="1" step="0.02" class="u-slider__range" :disabled="busy" />
  <input type="number" v-model.number="quality" min="0.3" max="1" step="0.02" class="u-slider__num" :disabled="busy" />
</div>
        </div></div>
        <div class="u-field"><label class="u-field__label">{{ tp('limitLongEdge') }}</label><div class="u-field__control">
          <input type="checkbox" v-model="limitEdge" :disabled="busy" class="u-switch" />
          <input
            v-if="limitEdge"
            type="number"
            v-model.number="maxEdge"
            min="256"
            max="8192"
            step="128"
            class="u-input edge-input"
            :disabled="busy"
          />
          <span v-if="limitEdge" class="hint">{{ tp('edgeHint') }}</span>
        </div></div>
        <div class="u-field"><div class="u-field__control">
          <ToolProgressBar :visible="busy" />
          <button type="button" class="u-btn u-btn--primary" :disabled="busy" @click="process">{{ tp('action') }}</button>
        </div></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edge-input {
  margin-left: 12px;
  width: 140px;
  vertical-align: middle;
}

.hint {
  margin-left: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
