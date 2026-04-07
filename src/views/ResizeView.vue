<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import { loadImage, resizeCanvas, canvasToBlob, downloadBlob, fileBaseName } from '../utils/image'

const { t, tp } = usePageI18n('resize')
const busy = ref(false)
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
    ElMessage.warning(t('msg.selectImageFirst'))
    return
  }
  busy.value = true
  try {
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

    let mime = currentFile.type && currentFile.type.startsWith('image/')
      ? currentFile.type
      : 'image/png'
    if (format.value === 'jpeg') mime = 'image/jpeg'
    if (format.value === 'png') mime = 'image/png'

    const blob = await canvasToBlob(
      out,
      mime,
      mime === 'image/jpeg' ? 0.92 : undefined
    )
    if (!blob) throw new Error('export')

    const ext =
      mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
    downloadBlob(blob, `${fileBaseName(currentFile)}-resized.${ext}`)
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
      <ImagePicker :disabled="busy" @file="onFile" />
    </el-card>

    <el-card class="tool-card">
      <el-form label-width="120px" label-position="left">
        <el-form-item :label="tp('mode')">
          <el-radio-group v-model="mode">
            <el-radio-button value="percent">{{ tp('percent') }}</el-radio-button>
            <el-radio-button value="pixel">{{ tp('pixel') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="mode === 'percent'" :label="tp('scalePercent')">
          <el-slider v-model="percent" :min="5" :max="200" show-input :disabled="busy" />
        </el-form-item>
        <template v-else>
          <el-form-item :label="tp('width')">
            <el-input-number v-model="width" :min="1" :max="16000" :disabled="busy" />
          </el-form-item>
          <el-form-item :label="tp('keepRatio')">
            <el-switch v-model="keepRatio" :disabled="busy" />
          </el-form-item>
          <el-form-item v-if="!keepRatio" :label="tp('height')">
            <el-input-number v-model="height" :min="1" :max="16000" :disabled="busy" />
          </el-form-item>
        </template>
        <el-form-item :label="tp('outputFormat')">
          <el-radio-group v-model="format">
            <el-radio-button value="original">{{ tp('fmtOriginal') }}</el-radio-button>
            <el-radio-button value="jpeg">JPEG</el-radio-button>
            <el-radio-button value="png">PNG</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <ToolProgressBar :visible="busy" />
          <el-button type="primary" :disabled="busy" @click="process">{{ tp('action') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
