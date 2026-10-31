<script setup>
import { ref } from 'vue'
import { toast } from '../utils/toast'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, resizeCanvas, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'
import { inferOutput } from '../utils/outputFormat'
import { useImageProcess } from '../composables/useImageProcess'

const { t, tp } = usePageI18n('resize')
const { busy, run } = useImageProcess()
const mode = ref('percent')
const percent = ref(80)
const width = ref(800)
const height = ref(600)
const keepRatio = ref(true)
const format = ref('original')
let currentFile = null

function onFile(file) {
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

    const srcW = img.naturalWidth
    const srcH = img.naturalHeight
    let tw = srcW
    let th = srcH

    if (mode.value === 'percent') {
      const p = percent.value / 100
      tw = Math.round(srcW * p)
      th = Math.round(srcH * p)
    } else {
      tw = Math.max(1, Math.round(width.value))
      if (keepRatio.value) {
        th = Math.max(1, Math.round((srcH / srcW) * tw))
      } else {
        th = Math.max(1, Math.round(height.value))
      }
    }

    const c0 = document.createElement('canvas')
    c0.width = srcW
    c0.height = srcH
    c0.getContext('2d').drawImage(img, 0, 0)
    const out = resizeCanvas(c0, tw, th)

    const { mime, ext, quality } = inferOutput(currentFile, { format: format.value })
    const blob = await canvasToBlob(out, mime, quality)
    if (!blob) throw new Error('export')

    downloadBlob(blob, `${fileBaseName(currentFile)}-resized.${ext}`)
    toast.success(t('msg.downloaded'))
  }, { errorMsg: t('msg.processFail') })
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
        <div class="u-field"><label class="u-field__label">{{ tp('mode') }}</label><div class="u-field__control">
          <div class="u-seg" role="radiogroup" aria-label="mode">
    <label class="u-seg__item" :class="{ 'is-active': mode === 'percent' }">
      <input type="radio" class="u-seg__input" value="percent" v-model.number="mode" /> {{ tp('percent') }}
    </label>
    <label class="u-seg__item" :class="{ 'is-active': mode === 'pixel' }">
      <input type="radio" class="u-seg__input" value="pixel" v-model.number="mode" /> {{ tp('pixel') }}
    </label>
  </div>
        </div></div>
        <div class="u-field" v-if="mode === 'percent'"><label class="u-field__label">{{ tp('scalePercent') }}</label><div class="u-field__control">
          <div class="u-slider">
  <input type="range" v-model.number="percent" min="5" max="200" class="u-slider__range" :disabled="busy" />
  <input type="number" v-model.number="percent" min="5" max="200" class="u-slider__num" :disabled="busy" />
</div>
        </div></div>
        <template v-else>
          <div class="u-field"><label class="u-field__label">{{ tp('width') }}</label><div class="u-field__control">
            <input type="number" v-model.number="width" min="1" max="16000" :disabled="busy" class="u-input" />
          </div></div>
          <div class="u-field"><label class="u-field__label">{{ tp('keepRatio') }}</label><div class="u-field__control">
            <input type="checkbox" v-model="keepRatio" :disabled="busy" class="u-switch" />
          </div></div>
          <div class="u-field" v-if="!keepRatio"><label class="u-field__label">{{ tp('height') }}</label><div class="u-field__control">
            <input type="number" v-model.number="height" min="1" max="16000" :disabled="busy" class="u-input" />
          </div></div>
        </template>
        <div class="u-field"><label class="u-field__label">{{ tp('outputFormat') }}</label><div class="u-field__control">
          <div class="u-seg" role="radiogroup" aria-label="format">
    <label class="u-seg__item" :class="{ 'is-active': format === 'original' }">
      <input type="radio" class="u-seg__input" value="original" v-model.number="format" /> {{ tp('fmtOriginal') }}
    </label>
    <label class="u-seg__item" :class="{ 'is-active': format === 'jpeg' }">
      <input type="radio" class="u-seg__input" value="jpeg" v-model.number="format" /> JPEG
    </label>
    <label class="u-seg__item" :class="{ 'is-active': format === 'png' }">
      <input type="radio" class="u-seg__input" value="png" v-model.number="format" /> PNG
    </label>
  </div>
        </div></div>
        <div class="u-field"><div class="u-field__control">
          <ToolProgressBar :visible="busy" />
          <button type="button" class="u-btn u-btn--primary" :disabled="busy" @click="process">{{ tp('action') }}</button>
        </div></div>
      </div>
    </div>
  </div>
</template>
