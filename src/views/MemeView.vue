<script setup>
import { ref, watch } from 'vue'
import { toast } from '../utils/toast'
import { useI18n } from '../i18n'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'
import { useImageProcess } from '../composables/useImageProcess'

const { t, locale } = useI18n()
const { tp } = usePageI18n('meme')
const { busy, run } = useImageProcess()
const topText = ref('')
const bottomText = ref('')
const fontSize = ref(42)
let currentFile = null

watch(
  locale,
  () => {
    topText.value = t('pages.meme.defaultTop')
    bottomText.value = t('pages.meme.defaultBottom')
  },
  { immediate: true }
)

function onFile(file) {
  currentFile = file
}

function drawMemeText(ctx, w, h, txt, bottom) {
  const lines = (txt || ' ').toUpperCase().split('\n')
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = Math.max(2, fontSize.value / 10)
  ctx.textAlign = 'center'
  ctx.textBaseline = bottom ? 'bottom' : 'top'
  ctx.font = `900 ${fontSize.value}px Impact, Arial Black, sans-serif`

  const lh = fontSize.value * 1.1
  const pad = 12
  if (bottom) {
    let y = h - pad
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]
      ctx.strokeText(line, w / 2, y)
      ctx.fillText(line, w / 2, y)
      y -= lh
    }
  } else {
    let y = pad
    for (const line of lines) {
      ctx.strokeText(line, w / 2, y)
      ctx.fillText(line, w / 2, y)
      y += lh
    }
  }
  ctx.restore()
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

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    drawMemeText(ctx, canvas.width, canvas.height, topText.value, false)
    drawMemeText(ctx, canvas.width, canvas.height, bottomText.value, true)

    const blob = await canvasToBlob(canvas, 'image/png')
    if (!blob) throw new Error('export')
    downloadBlob(blob, `${fileBaseName(currentFile)}-meme.png`)
    toast.success(t('msg.downloaded'))
  }, { errorMsg: t('msg.genFail') })
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
      <div class="u-form" style="--u-label-w: 100px">
        <div class="u-field"><label class="u-field__label">{{ tp('top') }}</label><div class="u-field__control">
          <textarea v-model="topText" rows="2" :disabled="busy" class="u-input"></textarea>
        </div></div>
        <div class="u-field"><label class="u-field__label">{{ tp('bottom') }}</label><div class="u-field__control">
          <textarea v-model="bottomText" rows="2" :disabled="busy" class="u-input"></textarea>
        </div></div>
        <div class="u-field"><label class="u-field__label">{{ tp('fontSize') }}</label><div class="u-field__control">
          <div class="u-slider">
  <input type="range" v-model.number="fontSize" min="18" max="96" class="u-slider__range" :disabled="busy" />
  <input type="number" v-model.number="fontSize" min="18" max="96" class="u-slider__num" :disabled="busy" />
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
