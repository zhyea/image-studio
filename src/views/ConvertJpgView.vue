<script setup>
import { ref } from 'vue'
import { toast } from '../utils/toast'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'
import { useImageProcess } from '../composables/useImageProcess'

const { t, tp } = usePageI18n('convertJpg')
const { busy, run } = useImageProcess()
const quality = ref(0.92)
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

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    const blob = await canvasToBlob(canvas, 'image/jpeg', quality.value)
    if (!blob) throw new Error('export')
    downloadBlob(blob, `${fileBaseName(currentFile)}.jpg`)
    toast.success(t('msg.downloadedJpg'))
  }, { errorMsg: t('msg.convertFail') })
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
        <div class="u-field"><label class="u-field__label">{{ tp('jpegQuality') }}</label><div class="u-field__control">
          <div class="u-slider">
  <input type="range" v-model.number="quality" min="0.5" max="1" step="0.02" class="u-slider__range" :disabled="busy" />
  <input type="number" v-model.number="quality" min="0.5" max="1" step="0.02" class="u-slider__num" :disabled="busy" />
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
