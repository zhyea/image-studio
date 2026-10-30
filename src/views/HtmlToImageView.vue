<script setup>
import { nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { usePageI18n } from '../composables/usePageI18n'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import { wrapHtmlFragment } from '../utils/skeletonGenerator'
import { useImageProcess } from '../composables/useImageProcess'

const { t, locale } = useI18n()
const { tp } = usePageI18n('htmlToImage')
const { busy, run } = useImageProcess()
const htmlInput = ref('')
const captureFrame = ref(null)

watch(
  locale,
  () => {
    htmlInput.value = t('pages.htmlToImage.sampleHtml')
  },
  { immediate: true }
)

function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))),
      type,
      quality,
    )
  })
}

async function renderAndCapture() {
  const iframe = captureFrame.value
  const body = iframe?.contentDocument?.body
  if (!body) {
    ElMessage.error(t('msg.captureFail'))
    return
  }
  await run(async () => {
    await nextTick()
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(body, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      width: body.scrollWidth || iframe.clientWidth,
      height: body.scrollHeight || iframe.clientHeight,
    })
    const blob = await canvasToBlob(canvas, 'image/png')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'html-snapshot.png'
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

    <el-alert
      class="tool-card"
      type="warning"
      show-icon
      :closable="false"
      :title="tp('warnTitle')"
    />

    <el-card class="tool-card">
      <el-input
        v-model="htmlInput"
        type="textarea"
        :rows="12"
        :placeholder="tp('placeholder')"
        :disabled="busy"
      />
      <div class="actions">
        <ToolProgressBar :visible="busy" />
        <el-button type="primary" :disabled="busy" @click="renderAndCapture">{{ tp('action') }}</el-button>
      </div>
    </el-card>

    <el-card class="tool-card">
      <template #header>{{ tp('previewHeader') }}</template>
      <iframe
        ref="captureFrame"
        class="capture-frame"
        title="preview"
        sandbox="allow-same-origin"
        referrerpolicy="no-referrer"
        :srcdoc="wrapHtmlFragment(htmlInput)"
      />
    </el-card>
  </div>
</template>

<style scoped>
.actions {
  margin-top: 14px;
}

.capture-frame {
  display: block;
  width: 100%;
  height: 360px;
  border: 0;
  border-radius: 8px;
  background: #fff;
}
</style>
