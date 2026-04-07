<script setup>
import { nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { usePageI18n } from '../composables/usePageI18n'
import ToolProgressBar from '../components/ToolProgressBar.vue'
import html2canvas from 'html2canvas'

const { t, locale } = useI18n()
const { tp } = usePageI18n('htmlToImage')
const busy = ref(false)
const htmlInput = ref('')
const captureRef = ref(null)

watch(
  locale,
  () => {
    htmlInput.value = t('pages.htmlToImage.sampleHtml')
  },
  { immediate: true }
)

async function renderAndCapture() {
  if (!captureRef.value) return
  busy.value = true
  try {
    await nextTick()
    await new Promise((r) => setTimeout(r, 50))

    const canvas = await html2canvas(captureRef.value, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    })

    canvas.toBlob((blob) => {
      if (!blob) {
        ElMessage.error(t('msg.exportFail'))
        busy.value = false
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'html-snapshot.png'
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success(t('msg.downloadedPng'))
      busy.value = false
    }, 'image/png')
  } catch (e) {
    console.error(e)
    ElMessage.error(t('msg.captureFail'))
    busy.value = false
  }
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
      <div ref="captureRef" class="capture-surface">
        <div class="inner" v-html="htmlInput" />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.actions {
  margin-top: 14px;
}

.capture-surface {
  min-height: 120px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  overflow: auto;
}

.inner {
  display: inline-block;
  text-align: left;
}
</style>
