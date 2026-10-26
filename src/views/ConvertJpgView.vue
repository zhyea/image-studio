<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
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
    ElMessage.warning(t('msg.selectImageFirst'))
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
    ElMessage.success(t('msg.downloadedJpg'))
  }, { errorMsg: t('msg.convertFail') })
}
</script>

<template>
  <div class="tool-page">
    <h1>{{ tp('h1') }}</h1>
    <p class="lead">{{ tp('lead') }}</p>

    <el-card class="tool-card">
      <ImagePicker :disabled="busy" @file="onFile" />
    </el-card>

    <el-card class="tool-card">
      <el-form label-width="100px">
        <el-form-item :label="tp('jpegQuality')">
          <el-slider v-model="quality" :min="0.5" :max="1" :step="0.02" show-input :disabled="busy" />
        </el-form-item>
        <el-form-item>
          <ToolProgressBar :visible="busy" />
          <el-button type="primary" :disabled="busy" @click="process">{{ tp('action') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
