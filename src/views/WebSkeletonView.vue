<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { usePageI18n } from '../composables/usePageI18n'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import html2canvas from 'html2canvas'
import { generateSkeletonHtml, wrapHtmlFragment } from '../utils/skeletonGenerator'
import { useImageProcess } from '../composables/useImageProcess'

const { t, locale } = useI18n()
const { tp } = usePageI18n('webSkeleton')

const htmlInput = ref('')
const bg = ref('#eeeeee')
const granularity = ref(50)
const htmlOut = ref('')
const previewKey = ref(0)
const sourceFrame = ref(null)
const previewFrame = ref(null)
const busy = ref(false)
const { busy: pngBusy, run: runPng } = useImageProcess()
const liveUpdating = ref(false)
const pendingGenerate = ref(false)

const GRANULARITY_DEBOUNCE_MS = 240
let granularityDebounceTimer = null

watch(
  locale,
  () => {
    htmlInput.value = t('pages.webSkeleton.sampleHtml')
  },
  { immediate: true },
)

function clampGranularity(v) {
  const n = Number(v)
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

function runSkeletonFromSourceDoc() {
  const doc = sourceFrame.value?.contentDocument
  if (!doc?.body) return null
  try {
    return generateSkeletonHtml({
      document: doc,
      background: bg.value || '#eee',
      granularity: clampGranularity(granularity.value),
    })
  } catch (e) {
    console.error(e)
    return null
  }
}

async function applySkeletonToPreview() {
  const html = runSkeletonFromSourceDoc()
  if (!html) {
    ElMessage.error(t('msg.skeletonGenFail'))
    return false
  }
  htmlOut.value = html
  previewKey.value += 1
  await nextTick()
  return true
}

function onSourceLoad() {
  if (!pendingGenerate.value) return
  pendingGenerate.value = false
  busy.value = true
  void (async () => {
    try {
      await nextTick()
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      await applySkeletonToPreview()
    } finally {
      busy.value = false
    }
  })()
}

function generate() {
  const raw = htmlInput.value?.trim()
  if (!raw) {
    ElMessage.warning(t('msg.skeletonNeedHtml'))
    return
  }
  const iframe = sourceFrame.value
  if (!iframe) return
  pendingGenerate.value = true
  iframe.srcdoc = wrapHtmlFragment(htmlInput.value)
}

function onGranularityInput() {
  granularity.value = clampGranularity(granularity.value)
  if (!htmlOut.value || !sourceFrame.value?.contentDocument?.body) return
  if (granularityDebounceTimer != null) clearTimeout(granularityDebounceTimer)
  granularityDebounceTimer = setTimeout(() => {
    granularityDebounceTimer = null
    void refreshGranularity()
  }, GRANULARITY_DEBOUNCE_MS)
}

async function refreshGranularity() {
  liveUpdating.value = true
  try {
    await applySkeletonToPreview()
  } finally {
    liveUpdating.value = false
  }
}

onBeforeUnmount(() => {
  if (granularityDebounceTimer != null) {
    clearTimeout(granularityDebounceTimer)
    granularityDebounceTimer = null
  }
})

async function copyHtml() {
  if (!htmlOut.value) return
  try {
    await navigator.clipboard.writeText(htmlOut.value)
    ElMessage.success(t('msg.copiedHtml'))
  } catch {
    ElMessage.error(t('msg.copyFail'))
  }
}

async function downloadPng() {
  if (!htmlOut.value || busy.value) return
  const iframe = previewFrame.value
  const body = iframe?.contentDocument?.body
  if (!body) {
    ElMessage.error(t('msg.captureFail'))
    return
  }
  await runPng(async () => {
    await nextTick()
    const canvas = await html2canvas(body, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      width: body.scrollWidth || iframe.clientWidth,
      height: body.scrollHeight || iframe.clientHeight,
    })
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
        'image/png',
      )
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'web-skeleton.png'
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success(t('msg.downloadedPng'))
  }, { errorMsg: t('msg.captureFail') })
}
</script>

<template>
  <div class="tool-page">
    <h1>{{ tp('h1') }}</h1>
    <p class="lead">{{ tp('lead') }}</p>

    <el-alert class="tool-card" type="warning" show-icon :closable="false" :title="tp('warnTitle')" />

    <el-card class="tool-card">
      <el-input
        v-model="htmlInput"
        type="textarea"
        :rows="10"
        :placeholder="tp('placeholder')"
        :disabled="busy || liveUpdating"
      />
      <div class="options-block">
        <div class="opt-row">
          <span class="opt-label">{{ tp('backgroundColor') }}</span>
          <el-input v-model="bg" class="opt-input" :disabled="busy || liveUpdating" />
        </div>
        <div class="opt-row opt-slider">
          <div class="slider-head">
            <span class="opt-label">{{ tp('granularity') }}</span>
            <span class="slider-value">{{ granularity }}</span>
          </div>
          <el-slider
            v-model="granularity"
            :min="0"
            :max="100"
            :step="1"
            :disabled="busy || liveUpdating"
            @input="onGranularityInput"
          />
          <p class="granularity-hint">{{ tp('granularityHint') }}</p>
        </div>
      </div>
      <div class="actions">
        <ToolProgressBar :visible="busy || pngBusy || liveUpdating" />
        <el-button type="primary" :disabled="busy || liveUpdating" @click="generate">{{ tp('actionGenerate') }}</el-button>
        <el-button :disabled="busy || pngBusy || liveUpdating || !htmlOut" @click="copyHtml">{{ tp('actionCopyHtml') }}</el-button>
        <el-button :disabled="busy || liveUpdating || !htmlOut || pngBusy" @click="downloadPng">
          {{ tp('actionDownloadPng') }}
        </el-button>
      </div>
    </el-card>

    <iframe
      ref="sourceFrame"
      class="source-iframe"
      title="source"
      sandbox="allow-same-origin"
      referrerpolicy="no-referrer"
      @load="onSourceLoad"
    />

    <el-card class="tool-card">
      <template #header>
        <span class="preview-header-row">
          <span>{{ tp('previewHeader') }}</span>
          <span v-if="liveUpdating" class="updating-tag">{{ tp('previewUpdating') }}</span>
        </span>
      </template>
      <div class="preview-shell" :class="{ 'preview-shell--dim': liveUpdating }">
        <p v-if="!htmlOut" class="preview-empty">{{ tp('previewEmpty') }}</p>
        <iframe
          v-else
          ref="previewFrame"
          :key="previewKey"
          class="preview-frame"
          :title="tp('previewAria')"
          :srcdoc="htmlOut"
          sandbox="allow-same-origin"
          referrerpolicy="no-referrer"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.tool-card {
  margin-bottom: 16px;
}

.options-block {
  margin-top: 16px;
}

.opt-row {
  margin-bottom: 12px;
}

.opt-label {
  display: block;
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}

.opt-input {
  max-width: 200px;
}

.slider-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.slider-value {
  font-variant-numeric: tabular-nums;
  color: var(--el-color-primary);
  font-weight: 600;
}

.granularity-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.45;
}

.actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.source-iframe {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  border: 0;
}

.preview-header-row {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.updating-tag {
  font-size: 12px;
  font-weight: normal;
  color: var(--el-color-primary);
}

.preview-shell {
  position: relative;
  min-height: 220px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  overflow: hidden;
}

.preview-shell--dim .preview-frame {
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.preview-empty {
  margin: 0;
  padding: 48px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.preview-frame {
  display: block;
  width: 100%;
  height: 360px;
  border: 0;
  background: #fff;
}
</style>
