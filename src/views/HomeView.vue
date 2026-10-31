<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../i18n'
import { TOOLS } from '../config/tools'
import { DEFAULT_LOCALE } from '../i18n/localeConfig.js'
import ToolIcon from '../components/ToolIcon.vue'

const { t } = useI18n()
const route = useRoute()

const locale = computed(() => route.params.locale || DEFAULT_LOCALE)

function toolTo(item) {
  return { name: item.name, params: { locale: locale.value } }
}
</script>

<template>
  <div class="home">
    <header class="hero">
      <h1 class="home-h1">{{ t('home.title') }}</h1>
      <p class="hero-sub">{{ t('home.lead') }}</p>
    </header>

    <section class="home-tools" :aria-label="t('nav.tools')">
      <!-- 原生 CSS Grid 取代 el-row/el-col；卡片用 router-link 取代可点击的 el-card，
           使工具入口在 SSR 产物中输出为真实 <a href>，利于 SEO / 中键新开 / 键盘可达 -->
      <div class="tool-grid">
        <router-link
          v-for="item in TOOLS"
          :key="item.slug"
          class="tool-card"
          :to="toolTo(item)"
        >
          <div class="card-head-row">
            <div
              class="icon-wrap"
              :style="{
                background: `${item.color}18`,
                color: item.color,
              }"
            >
              <ToolIcon :name="item.icon" :size="28" />
            </div>
            <h2 class="card-title">{{ t(`tools.${item.slug}.title`) }}</h2>
          </div>
          <p class="card-desc">{{ t(`tools.${item.slug}.desc`) }}</p>
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 颜色全部带 fallback：首页已不引入任何 Element Plus 组件，
   其 --el-* 变量可能未定义，fallback 保证裸变量环境下仍可读。 */
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
  color: var(--el-text-color-primary, #303133);
  letter-spacing: -0.02em;
}

.hero-sub {
  margin: 0;
  color: var(--el-text-color-secondary, #606266);
  font-size: 15px;
  line-height: 1.7;
}

.home-tools {
  margin-top: 4px;
}

/* 断点沿用 el-row/el-col 的 xs=24 / sm=12 / md=8 / lg=6（1/2/3/4 列） */
.tool-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 992px) {
  .tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .tool-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.tool-card {
  display: block;
  padding: 18px 16px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  background: var(--el-bg-color, #fff);
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.tool-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px rgb(0 0 0 / 8%);
}

.tool-card:focus-visible {
  outline: 2px solid var(--el-color-primary, #409eff);
  outline-offset: 2px;
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
  color: var(--el-text-color-primary, #303133);
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary, #606266);
  line-height: 1.5;
  min-height: 40px;
}
</style>
