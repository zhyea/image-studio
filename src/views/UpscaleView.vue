<script setup>
import { computed, ref } from 'vue'
import { toast } from '../utils/toast'
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
import { useImageProcess } from '../composables/useImageProcess'
import { MAX_EXPORT_PIXELS } from '../constants/exportLimits'
import { inferOutput } from '../utils/outputFormat'

/** 送入 AI 前长边上限（像素）；与分块超分配合，避免极端大图仍占满显存。 */
const AI_MAX_EDGE = 1024

const { t, tp } = usePageI18n('upscale')
const { busy, run } = useImageProcess()
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
    toast.warning(t('msg.scaleGt100'))
    return
  }
  const url = URL.createObjectURL(currentFile)
  const img = await loadImage(url)
  URL.revokeObjectURL(url)

  const w = Math.round(img.naturalWidth * s)
  const h = Math.round(img.naturalHeight * s)
  const maxPx = MAX_EXPORT_PIXELS
  if (w * h > maxPx) {
    toast.error(t('msg.tooManyPixels'))
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

  const { mime, ext, quality } = inferOutput(currentFile, { format: format.value })
  const blob = await canvasToBlob(out, mime, quality)
  if (!blob) throw new Error('export')

  downloadBlob(blob, `${fileBaseName(currentFile)}-upscaled.${ext}`)
  toast.success(t('msg.downloaded'))
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
      toast.info(tp('aiShrunk', { n: AI_MAX_EDGE }))
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
    toast.success(t('msg.downloaded'))
  } finally {
    progress.value = 0
  }
}

async function process() {
  if (!currentFile) {
    toast.warning(t('msg.selectImageFirst'))
    return
  }
  await run(
    async () => {
      if (mode.value === 'fast') {
        await processFast()
      } else {
        await processAi()
      }
    },
    {
      // 传函数以便在出错时刻才读 mode，与原「catch 内才读取」的语义严格等价
      errorMsg: () => (mode.value === 'ai' ? t('msg.aiUpscaleFail') : t('msg.processFail')),
    },
  )
}
</script>

<template>
  <div class="tool-page">
    <h1>{{ tp('h1') }}</h1>
    <p class="lead">{{ tp('lead') }}</p>

    <div class="tool-card refs-card">
      <span class="refs-intro">{{ tp('refsIntro') }}</span>
      <div class="refs-links">
        <a href="https://zh.recompressor.com/" target="_blank" rel="noopener noreferrer" class="u-link">
          {{ tp('linkRecompressor') }}
        </a>
        <a href="https://www.waifu2x.net/" target="_blank" rel="noopener noreferrer" class="u-link">
          {{ tp('linkWaifu2x') }}
        </a>
        <a href="https://bigjpg.com/" target="_blank" rel="noopener noreferrer" class="u-link">
          {{ tp('linkBigjpg') }}
        </a>
        <a href="https://upscalerjs.com/" target="_blank" rel="noopener noreferrer" class="u-link">
          {{ tp('linkUpscalerJs') }}
        </a>
      </div>
    </div>

    <div class="tool-card">
      <ImagePicker :disabled="busy" @file="onFile" />
    </div>

    <div class="tool-card">
      <div class="u-form" style="--u-label-w: 130px">
        <div class="u-field"><label class="u-field__label">{{ tp('mode') }}</label><div class="u-field__control">
          <div class="u-seg" role="radiogroup" aria-label="mode">
    <label class="u-seg__item" :class="{ 'is-active': mode === 'fast' }">
      <input type="radio" class="u-seg__input" value="fast" v-model.number="mode" :disabled="busy" /> {{ tp('modeFast') }}
    </label>
    <label class="u-seg__item" :class="{ 'is-active': mode === 'ai' }">
      <input type="radio" class="u-seg__input" value="ai" v-model.number="mode" :disabled="busy" /> {{ tp('modeAi') }}
    </label>
  </div>
        </div></div>

        <p class="mode-lead">{{ leadText }}</p>

        <template v-if="mode === 'fast'">
          <div class="u-field"><label class="u-field__label">{{ tp('scale') }}</label><div class="u-field__control">
            <div class="u-slider">
  <input type="range" v-model.number="scalePercent" min="101" max="400" step="1" class="u-slider__range" :disabled="busy" />
  <input type="number" v-model.number="scalePercent" min="101" max="400" step="1" class="u-slider__num" :disabled="busy" />
</div>
          </div></div>
          <div class="u-field"><label class="u-field__label">{{ tp('outputFormat') }}</label><div class="u-field__control">
            <div class="u-seg" role="radiogroup" aria-label="format">
    <label class="u-seg__item" :class="{ 'is-active': format === 'png' }">
      <input type="radio" class="u-seg__input" value="png" v-model.number="format" /> PNG
    </label>
    <label class="u-seg__item" :class="{ 'is-active': format === 'jpeg' }">
      <input type="radio" class="u-seg__input" value="jpeg" v-model.number="format" /> JPEG
    </label>
  </div>
          </div></div>
        </template>

        <template v-else>
          <div class="u-alert u-alert--info ai-alert">
            {{ tp('aiEdgeNote', { n: AI_MAX_EDGE }) }}
          </div>
          <div class="u-field"><label class="u-field__label">{{ tp('aiFactor') }}</label><div class="u-field__control">
            <div class="u-seg" role="radiogroup" aria-label="aiFactor">
    <label class="u-seg__item" :class="{ 'is-active': aiFactor === 2 }">
      <input type="radio" class="u-seg__input" value="2" v-model.number="aiFactor" :disabled="busy" /> {{ tp('ai2x') }}
    </label>
    <label class="u-seg__item" :class="{ 'is-active': aiFactor === 4 }">
      <input type="radio" class="u-seg__input" value="4" v-model.number="aiFactor" :disabled="busy" /> {{ tp('ai4x') }}
    </label>
  </div>
          </div></div>
        </template>

        <div class="u-field"><div class="u-field__control">
          <ToolProgressBar
            :visible="busy"
            :percentage="mode === 'ai' ? Math.round(progress * 100) : undefined"
          />
          <button type="button" class="u-btn u-btn--primary" :disabled="busy" @click="process">
            {{ mode === 'ai' ? tp('actionAi') : tp('action') }}
          </button>
        </div></div>
      </div>
    </div>
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
