<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { TOOLS } from '../config/tools'
import { DEFAULT_LOCALE } from '../i18n/localeConfig.js'
import {
  Histogram,
  ZoomIn,
  MagicStick,
  ScaleToOriginal,
  Crop,
  PictureFilled,
  RefreshRight,
  EditPen,
  ChatLineRound,
  DocumentCopy,
  Hide,
  Grid,
} from '@element-plus/icons-vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const locale = computed(() => route.params.locale || DEFAULT_LOCALE)

const ICON_MAP = {
  Histogram,
  ZoomIn,
  MagicStick,
  ScaleToOriginal,
  Crop,
  PictureFilled,
  RefreshRight,
  EditPen,
  ChatLineRound,
  DocumentCopy,
  Hide,
  Grid,
}

function goTool(item) {
  router.push({ name: item.name, params: { locale: locale.value } })
}
</script>

<template>
  <div class="home">
    <header class="hero">
      <h1 class="home-h1">{{ t('home.title') }}</h1>
      <p class="hero-sub">{{ t('home.lead') }}</p>
    </header>

    <section class="home-tools" :aria-label="t('nav.tools')">
    <el-row :gutter="16" class="grid">
      <el-col
        v-for="item in TOOLS"
        :key="item.slug"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
      >
        <el-card
          class="tool-card-home"
          shadow="hover"
          :body-style="{ padding: '18px 16px' }"
          @click="goTool(item)"
        >
          <div class="card-head-row">
            <div
              class="icon-wrap"
              :style="{
                background: `${item.color}18`,
                color: item.color,
              }"
            >
              <el-icon :size="28">
                <component :is="ICON_MAP[item.icon]" />
              </el-icon>
            </div>
            <h2 class="card-title">{{ t(`tools.${item.slug}.title`) }}</h2>
          </div>
          <p class="card-desc">{{ t(`tools.${item.slug}.desc`) }}</p>
        </el-card>
      </el-col>
    </el-row>
    </section>
  </div>
</template>

<style scoped>
.home {
  text-align: left;
}

.hero {
  margin-bottom: 28px;
}

.home-h1 {
  font-size: clamp(1.35rem, 2.5vw, 1.75rem);
  font-weight: 600;
  line-height: 1.3;
  margin: 0 0 14px;
  color: var(--el-text-color-primary);
  letter-spacing: -0.02em;
}

.hero-sub {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 15px;
  line-height: 1.7;
}

.home-tools {
  margin-top: 4px;
}

.grid {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.tool-card-home {
  margin-bottom: 16px;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.tool-card-home:hover {
  transform: translateY(-3px);
}

.card-head-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.icon-wrap {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: 16px;
  line-height: 1.35;
  color: var(--el-text-color-primary);
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  min-height: 40px;
}
</style>
