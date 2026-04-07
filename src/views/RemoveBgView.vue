<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'
import { applyColorKey } from '../utils/colorKey'

const { t, tp } = usePageI18n('removeBg')
const busy = ref(false)
const previewUrl = ref('')
const previewImgRef = ref(null)
const tolerance = ref(48)
const feather = ref(12)
const picked = ref({ r: 255, g: 255, b: 255 })

const workCanvas = ref(null)
let currentFile = null
let objectUrl = ''

async function onFile(file) {
  currentFile = file
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }
  workCanvas.value = null
  previewUrl.value = ''
  if (!file) return

  busy.value = true
  try {
    objectUrl = URL.createObjectURL(file)
    const img = await loadImage(objectUrl)
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)
    workCanvas.value = c
    previewUrl.value = objectUrl
  } catch (e) {
    console.error(e)
    ElMessage.error(t('msg.readImageFail'))
  } finally {
    busy.value = false
  }
}

function sampleFromEvent(e) {
  const canvas = workCanvas.value
  const img = previewImgRef.value
  if (!canvas || !img) return

  const rect = img.getBoundingClientRect()
  const nx = (e.clientX - rect.left) / rect.width
  const ny = (e.clientY - rect.top) / rect.height
  const x = Math.min(canvas.width - 1, Math.max(0, Math.floor(nx * canvas.width)))
  const y = Math.min(canvas.height - 1, Math.max(0, Math.floor(ny * canvas.height)))
  const [r, g, b] = canvas.getContext('2d').getImageData(x, y, 1, 1).data
  picked.value = { r, g, b }
  ElMessage.success(t('msg.sampledRgb', { r, g, b }))
}

async function process() {
  const canvas = workCanvas.value
  if (!canvas || !currentFile) {
    ElMessage.warning(t('msg.selectImageRemoveBg'))
    return
  }
  busy.value = true
  try {
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    applyColorKey(
      imageData,
      [picked.value.r, picked.value.g, picked.value.b],
      tolerance.value,
      feather.value
    )
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    out.getContext('2d').putImageData(imageData, 0, 0)

    const blob = await canvasToBlob(out, 'image/png')
    if (!blob) throw new Error('export')
    downloadBlob(blob, `${fileBaseName(currentFile)}-nobg.png`)
    ElMessage.success(t('msg.downloadedPng'))
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
      <ImagePicker :disabled="busy" hide-preview @file="onFile" />
    </el-card>

    <el-card v-if="previewUrl" class="tool-card">
      <p class="hint">{{ tp('hintPick') }}</p>
      <div class="preview-box">
        <img
          ref="previewImgRef"
          :src="previewUrl"
          :alt="tp('previewAlt')"
          class="pick-img"
          crossorigin="anonymous"
          @click="sampleFromEvent"
        />
      </div>
      <div class="picked">
        {{ tp('picked') }}
        <span
          class="swatch"
          :style="{
            background: `rgb(${picked.r},${picked.g},${picked.b})`,
          }"
        />
        RGB({{ picked.r }}, {{ picked.g }}, {{ picked.b }})
      </div>
    </el-card>

    <el-card class="tool-card">
      <el-form label-width="100px" label-position="left">
        <el-form-item :label="tp('tolerance')">
          <el-slider v-model="tolerance" :min="5" :max="120" :step="1" show-input :disabled="busy" />
        </el-form-item>
        <el-form-item :label="tp('feather')">
          <el-slider v-model="feather" :min="0" :max="40" :step="1" show-input :disabled="busy" />
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
.hint {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.preview-box {
  text-align: center;
  margin-bottom: 12px;
}

.pick-img {
  max-width: 100%;
  max-height: 360px;
  border-radius: 8px;
  cursor: crosshair;
  border: 1px solid var(--el-border-color-lighter);
}

.picked {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.swatch {
  display: inline-block;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  vertical-align: middle;
}
</style>
