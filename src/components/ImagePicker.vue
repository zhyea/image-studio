<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { UploadFilled } from '@element-plus/icons-vue'
import { readFileAsDataURL } from '../utils/image'

const { t } = useI18n()

const props = defineProps({
  accept: { type: String, default: 'image/*' },
  disabled: { type: Boolean, default: false },
  hidePreview: { type: Boolean, default: false },
})

const emit = defineEmits(['file'])

const previewUrl = ref('')
const fileName = ref('')

async function onChange(uploadFile) {
  const raw = uploadFile?.raw
  if (!raw || !raw.type.startsWith('image/')) return
  fileName.value = raw.name
  previewUrl.value = await readFileAsDataURL(raw)
  emit('file', raw)
}

function clear() {
  previewUrl.value = ''
  fileName.value = ''
  emit('file', null)
}

defineExpose({ clear, previewUrl, fileName })
</script>

<template>
  <div class="image-picker">
    <el-upload
      drag
      :auto-upload="false"
      :show-file-list="false"
      :accept="accept"
      :disabled="disabled"
      @change="onChange"
    >
      <el-icon class="upload-icon"><UploadFilled /></el-icon>
      <div class="el-upload__text">
        {{ t('picker.dragText') }}<em>{{ t('picker.clickPick') }}</em>
      </div>
      <template #tip>
        <div v-if="fileName" class="tip-name">{{ fileName }}</div>
      </template>
    </el-upload>
    <div v-if="previewUrl && !hidePreview" class="preview">
      <img :src="previewUrl" :alt="t('picker.previewAlt')" />
      <el-button type="danger" link size="small" :disabled="disabled" @click="clear">
        {{ t('picker.clear') }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.image-picker {
  width: 100%;
}

.upload-icon {
  font-size: 48px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.tip-name {
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.preview {
  margin-top: 16px;
  text-align: center;
}

.preview img {
  max-width: 100%;
  max-height: 320px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  vertical-align: middle;
}
</style>
