<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, resizeCanvas, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'

const { t, tp } = usePageI18n('compress')
const busy = ref(false)
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
    ElMessage.warning(t('msg.selectImageFirst'))
    return
  }
  busy.value = true
  try {
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
    ElMessage.success(t('msg.downloaded'))
  } catch (e) {
    console.error(e)
    ElMessage.error(t('msg.processFailRetry'))
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
      <ImagePicker :disabled="busy" @file="onFile" />
    </el-card>

    <el-card class="tool-card">
      <el-form label-width="120px" label-position="left">
        <el-form-item :label="tp('outputFormat')">
          <el-radio-group v-model="format">
            <el-radio-button value="jpeg">JPEG</el-radio-button>
            <el-radio-button value="png">PNG</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="format === 'jpeg'" :label="tp('jpegQuality')">
          <el-slider v-model="quality" :min="0.3" :max="1" :step="0.02" show-input :disabled="busy" />
        </el-form-item>
        <el-form-item :label="tp('limitLongEdge')">
          <el-switch v-model="limitEdge" :disabled="busy" />
          <el-input-number
            v-if="limitEdge"
            v-model="maxEdge"
            :min="256"
            :max="8192"
            :step="128"
            class="edge-input"
            :disabled="busy"
          />
          <span v-if="limitEdge" class="hint">{{ tp('edgeHint') }}</span>
        </el-form-item>
        <el-form-item>
          <ToolProgressBar :visible="busy" />
          <el-button type="primary" :disabled="busy" @click="process">{{ tp('action') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
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
