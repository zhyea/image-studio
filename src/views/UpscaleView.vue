<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import ImagePicker from '../components/ImagePicker.vue'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { usePageI18n } from '../composables/usePageI18n'
import {
  loadImage,
  resizeCanvasUpscale,
  resizeCanvasWithPica,
  canvasToBlob,
  downloadBlob,
  fileBaseName,
  dataUrlToBlob,
  constrainImageMaxEdge,
} from '../utils/image'
import { runAiSuperResolution } from '../utils/aiUpscale'

/** 送入 AI 前长边上限（像素）；与分块超分配合，避免极端大图仍占满显存。 */
const AI_MAX_EDGE = 1024

const { t, tp } = usePageI18n('upscale')
const busy = ref(false)
const mode = ref('fast')
const scalePercent = ref(200)
const format = ref('png')
const aiFactor = ref('2')
const progress = ref(0)

const leadText = computed(() =>
  mode.value === 'ai' ? tp('leadAi') : tp('leadFast')
)

let currentFile = null

function onFile(file) {
  currentFile = file
}

async function processFast() {
  const s = scalePercent.value / 100
  if (s < 1.01) {
    ElMessage.warning(t('msg.scaleGt100'))
    return
  }
  const url = URL.createObjectURL(currentFile)
  const img = await loadImage(url)
  URL.revokeObjectURL(url)

  const w = Math.round(img.naturalWidth * s)
  const h = Math.round(img.naturalHeight * s)
  const maxPx = 12000 * 12000
  if (w * h > maxPx) {
    ElMessage.error(t('msg.tooManyPixels'))
    return
  }

  const c0 = document.createElement('canvas')
  c0.width = img.naturalWidth
  c0.height = img.naturalHeight
  const ctx0 = c0.getContext('2d', { alpha: true })
  ctx0.imageSmoothingEnabled = true
  ctx0.imageSmoothingQuality = 'high'
  ctx0.drawImage(img, 0, 0)

  let out
  try {
    out = await resizeCanvasWithPica(c0, w, h)
  } catch (e) {
    console.warn('[upscale] pica failed, fallback to canvas steps', e)
    out = resizeCanvasUpscale(c0, w, h)
  }

  const mime = format.value === 'jpeg' ? 'image/jpeg' : 'image/png'
  const blob = await canvasToBlob(out, mime, mime === 'image/jpeg' ? 0.92 : undefined)
  if (!blob) throw new Error('export')

  const ext = format.value === 'jpeg' ? 'jpg' : 'png'
  downloadBlob(blob, `${fileBaseName(currentFile)}-upscaled.${ext}`)
  ElMessage.success(t('msg.downloaded'))
}

async function processAi() {
  progress.value = 0
  try {
    const url = URL.createObjectURL(currentFile)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)

    const beforeW = img.naturalWidth
    const beforeH = img.naturalHeight
    const prepared = await constrainImageMaxEdge(img, AI_MAX_EDGE)
    if (prepared.naturalWidth !== beforeW || prepared.naturalHeight !== beforeH) {
      ElMessage.info(tp('aiShrunk', { n: AI_MAX_EDGE }))
    }

    const passes = aiFactor.value === '4' ? 2 : 1
    const dataUrl = await runAiSuperResolution(prepared, {
      passes,
      onProgress: (p) => {
        progress.value = p
      },
    })

    const blob = dataUrlToBlob(dataUrl)
    const tag = passes === 2 ? 'ai-4x' : 'ai-2x'
    downloadBlob(blob, `${fileBaseName(currentFile)}-${tag}.png`)
    ElMessage.success(t('msg.downloaded'))
  } finally {
    progress.value = 0
  }
}

async function process() {
  if (!currentFile) {
    ElMessage.warning(t('msg.selectImageFirst'))
    return
  }
  busy.value = true
  try {
    if (mode.value === 'fast') {
      await processFast()
    } else {
      await processAi()
    }
  } catch (e) {
    console.error(e)
    ElMessage.error(mode.value === 'ai' ? t('msg.aiUpscaleFail') : t('msg.processFail'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="tool-page">
    <h1>{{ tp('h1') }}</h1>
    <p class="lead">{{ tp('lead') }}</p>

    <el-card class="tool-card refs-card" shadow="never">
      <span class="refs-intro">{{ tp('refsIntro') }}</span>
      <el-space wrap :size="12" class="refs-links">
        <el-link href="https://zh.recompressor.com/" target="_blank" rel="noopener noreferrer" type="primary">
          {{ tp('linkRecompressor') }}
        </el-link>
        <el-link href="https://www.waifu2x.net/" target="_blank" rel="noopener noreferrer" type="primary">
          {{ tp('linkWaifu2x') }}
        </el-link>
        <el-link href="https://bigjpg.com/" target="_blank" rel="noopener noreferrer" type="primary">
          {{ tp('linkBigjpg') }}
        </el-link>
        <el-link href="https://upscalerjs.com/" target="_blank" rel="noopener noreferrer" type="info">
          {{ tp('linkUpscalerJs') }}
        </el-link>
      </el-space>
    </el-card>

    <el-card class="tool-card">
      <ImagePicker :disabled="busy" @file="onFile" />
    </el-card>

    <el-card class="tool-card">
      <el-form label-width="130px" label-position="left">
        <el-form-item :label="tp('mode')">
          <el-radio-group v-model="mode" :disabled="busy">
            <el-radio-button value="fast">{{ tp('modeFast') }}</el-radio-button>
            <el-radio-button value="ai">{{ tp('modeAi') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <p class="mode-lead">{{ leadText }}</p>

        <template v-if="mode === 'fast'">
          <el-form-item :label="tp('scale')">
            <el-slider v-model="scalePercent" :min="101" :max="400" :step="1" show-input :disabled="busy" />
          </el-form-item>
          <el-form-item :label="tp('outputFormat')">
            <el-radio-group v-model="format">
              <el-radio-button value="png">PNG</el-radio-button>
              <el-radio-button value="jpeg">JPEG</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </template>

        <template v-else>
          <el-alert type="info" show-icon :closable="false" class="ai-alert">
            {{ tp('aiEdgeNote', { n: AI_MAX_EDGE }) }}
          </el-alert>
          <el-form-item :label="tp('aiFactor')">
            <el-radio-group v-model="aiFactor" :disabled="busy">
              <el-radio-button value="2">{{ tp('ai2x') }}</el-radio-button>
              <el-radio-button value="4">{{ tp('ai4x') }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </template>

        <el-form-item>
          <ToolProgressBar
            :visible="busy"
            :percentage="mode === 'ai' ? Math.round(progress * 100) : undefined"
          />
          <el-button type="primary" :disabled="busy" @click="process">
            {{ mode === 'ai' ? tp('actionAi') : tp('action') }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.refs-card {
  margin-bottom: 16px;
  background: var(--el-fill-color-lighter);
}

.refs-intro {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.refs-links {
  margin-top: 4px;
}

.mode-lead {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.55;
}

.ai-alert {
  margin-bottom: 16px;
}
</style>
