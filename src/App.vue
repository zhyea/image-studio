<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from './i18n'
import { TOOLS } from './config/tools'
import { DEFAULT_LOCALE, LOCALE_META, SUPPORTED_LOCALES } from './i18n/localeConfig.js'
import { useHead } from '@unhead/vue'
import { buildHeadConfig } from './seo/headConfig'

/** 小于等于此宽度时顶栏横向菜单折叠为抽屉 */
const COMPACT_NAV_MAX_PX = 540

function readCompactNavMatch() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${COMPACT_NAV_MAX_PX}px)`).matches
}

const i18n = useI18n()
const { t } = i18n
const route = useRoute()
const router = useRouter()

// 声明式 SEO head：vite-ssg 在构建期把每个路由的 title/meta/canonical/hreflang/json-ld 写入静态 HTML。
// 此处传入注入的 i18n（即本路由独立实例的 Composer），与 SSR 预渲染语种一致。
useHead(() => buildHeadConfig(route, i18n))

const localeParam = computed(() => route.params.locale || DEFAULT_LOCALE)
const isCompactNav = ref(readCompactNavMatch())
const drawerVisible = ref(false)
const langMenuOpen = ref(false)

const activeMenu = computed(() => {
  const n = route.name
  if (n === 'home') return 'home'
  if (typeof n === 'string' && TOOLS.some((item) => item.name === n)) return n
  return ''
})

function switchLocale(code) {
  const m = route.path.match(/^\/[^/]+(\/.*)?$/)
  const suffix = m && m[1] ? m[1] : ''
  router.push(`/${code}${suffix}`)
}

function updateCompactNav() {
  isCompactNav.value = readCompactNavMatch()
}

function onWindowResize() {
  updateCompactNav()
}

function onKeyDown(e) {
  if (e.key !== 'Escape') return
  langMenuOpen.value = false
  drawerVisible.value = false
}

onMounted(() => {
  updateCompactNav()
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeyDown)
})

watch(
  () => [route.name, route.params.locale, route.path],
  () => {
    drawerVisible.value = false
    langMenuOpen.value = false
  },
)

function goHome() {
  router.push({ name: 'home', params: { locale: localeParam.value } })
}

function onMenuSelect(key) {
  if (key === 'home') {
    goHome()
    return
  }
  const tool = TOOLS.find((item) => item.name === key)
  if (tool) {
    router.push({ name: tool.name, params: { locale: localeParam.value } })
  }
}

function onDrawerMenuSelect(key) {
  onMenuSelect(key)
  drawerVisible.value = false
}

const isHomePage = computed(() => route.name === 'home')
const isNotFoundPage = computed(() => route.name === 'not-found' || route.name === 'not-found-global')
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand" @click="goHome">
        <img class="brand-logo" src="/logo.svg" width="36" height="36" alt="" />
        <span class="brand-text">Image Studio</span>
      </div>

      <!-- 宽屏：横向工具导航（原生 nav + button，取代 el-menu） -->
      <nav v-if="!isCompactNav" class="header-menu-wrap" :aria-label="t('nav.menuTitle')">
        <ul class="header-menu">
          <li>
            <button
              type="button"
              class="nav-item"
              :class="{ 'is-active': activeMenu === 'home' }"
              :aria-current="activeMenu === 'home' ? 'page' : undefined"
              @click="onMenuSelect('home')"
            >
              {{ t('nav.home') }}
            </button>
          </li>
          <li v-for="item in TOOLS" :key="'v-' + item.name">
            <button
              type="button"
              class="nav-item"
              :class="{ 'is-active': activeMenu === item.name }"
              :aria-current="activeMenu === item.name ? 'page' : undefined"
              @click="onMenuSelect(item.name)"
            >
              {{ t(`tools.${item.slug}.title`) }}
            </button>
          </li>
        </ul>
      </nav>

      <!-- 语言切换（原生按钮 + 浮层，取代 el-dropdown） -->
      <div class="header-lang-wrap">
        <button
          type="button"
          class="lang-trigger"
          :aria-label="t('nav.switchLanguage')"
          :aria-expanded="langMenuOpen"
          aria-haspopup="menu"
          @click="langMenuOpen = !langMenuOpen"
        >
          <span class="lang-trigger-label">{{ LOCALE_META[localeParam].label }}</span>
          <svg class="lang-trigger-caret" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <!-- 透明遮罩：点击外部即关闭浮层（避免依赖 document 监听，SSR 安全） -->
        <button
          v-if="langMenuOpen"
          type="button"
          class="popover-backdrop"
          tabindex="-1"
          aria-hidden="true"
          @click="langMenuOpen = false"
        ></button>
        <ul v-if="langMenuOpen" class="lang-menu" role="menu">
          <li v-for="code in SUPPORTED_LOCALES" :key="code" role="none">
            <button
              type="button"
              role="menuitem"
              class="lang-menu-item"
              :class="{ 'is-current': code === localeParam }"
              :disabled="code === localeParam"
              @click="switchLocale(code); langMenuOpen = false"
            >
              {{ LOCALE_META[code].label }}
            </button>
          </li>
        </ul>
      </div>

      <!-- 窄屏：抽屉入口 -->
      <div v-if="isCompactNav" class="header-nav-toggle-wrap">
        <button
          type="button"
          class="header-nav-menu-btn"
          :aria-label="t('nav.openMenu')"
          @click="drawerVisible = true"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 窄屏抽屉（原生遮罩 + 面板，取代 el-drawer） -->
    <div v-if="drawerVisible" class="drawer-root">
      <div class="drawer-overlay" @click="drawerVisible = false"></div>
      <aside class="drawer-panel" role="dialog" aria-modal="true" :aria-label="t('nav.menuTitle')">
        <div class="drawer-head">
          <span class="drawer-title">{{ t('nav.menuTitle') }}</span>
          <button
            type="button"
            class="drawer-close"
            :aria-label="t('nav.closeMenu')"
            @click="drawerVisible = false"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <nav class="drawer-nav">
          <button
            type="button"
            class="drawer-nav-item"
            :class="{ 'is-active': activeMenu === 'home' }"
            @click="onDrawerMenuSelect('home')"
          >
            {{ t('nav.home') }}
          </button>
          <button
            v-for="item in TOOLS"
            :key="'d-' + item.name"
            type="button"
            class="drawer-nav-item"
            :class="{ 'is-active': activeMenu === item.name }"
            @click="onDrawerMenuSelect(item.name)"
          >
            {{ t(`tools.${item.slug}.title`) }}
          </button>
        </nav>
        <div class="drawer-lang">
          <p class="drawer-lang-title">{{ t('nav.switchLanguage') }}</p>
          <div class="drawer-lang-chips">
            <button
              v-for="code in SUPPORTED_LOCALES"
              :key="'lg-' + code"
              type="button"
              class="lang-chip"
              :class="{ 'is-current': code === localeParam }"
              @click="switchLocale(code); drawerVisible = false"
            >
              {{ LOCALE_META[code].label }}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <main class="app-main" :class="{ 'app-main--tool': !isHomePage && !isNotFoundPage }">
      <router-view />
    </main>
    <footer class="app-footer">
      <p>{{ t('footer.line') }}</p>
    </footer>
  </div>
</template>

<style scoped>
/* 说明：外壳已改为原生 HTML。颜色仍优先复用 EP 设计变量以保持观感一致，
   但每项都带兜底值——将来工具页也去掉 EP 后，外壳样式依然成立。 */
.app-shell {
  min-height: 100vh;
  background: var(--studio-bg, #f5f7fa);
}

.app-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(16px / 3);
  height: 56px;
  padding: 0 20px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--el-border-color-light, #e4e7ed);
  background: var(--el-bg-color, #ffffff);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.brand-logo {
  display: block;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
}

.brand-text {
  font-weight: 600;
  font-size: 18px;
  color: var(--el-text-color-primary, #303133);
}

/* ---------- 宽屏横向导航 ---------- */
.header-menu-wrap {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.header-menu {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  background: transparent;
}

.nav-item {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  display: block;
  padding: 0 14px;
  height: 55px;
  font-size: 14px;
  font-family: inherit;
  white-space: nowrap;
  color: var(--el-text-color-regular, #606266);
  border-bottom: 2px solid transparent;
}

.nav-item:hover {
  color: var(--el-color-primary, #409eff);
}

.nav-item.is-active {
  color: var(--el-color-primary, #409eff);
  border-bottom-color: var(--el-color-primary, #409eff);
  font-weight: 500;
}

/* ---------- 语言切换 ---------- */
.header-lang-wrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-inline-start: 8px;
}

.lang-trigger {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: min(140px, 32vw);
  padding: 4px 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--el-color-primary, #409eff);
}

.lang-trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lang-trigger-caret {
  flex-shrink: 0;
}

/* 透明遮罩：捕获「点击外部」以关闭浮层，无视觉影响 */
.popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  border: none;
  padding: 0;
  background: transparent;
  cursor: default;
}

.lang-menu {
  position: absolute;
  top: calc(100% + 6px);
  inset-inline-end: 0;
  z-index: 2001;
  min-width: 140px;
  max-height: 60vh;
  overflow-y: auto;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  background: var(--el-bg-color-overlay, #ffffff);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.lang-menu-item {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  display: block;
  width: 100%;
  padding: 7px 16px;
  font-size: 14px;
  font-family: inherit;
  text-align: start;
  white-space: nowrap;
  color: var(--el-text-color-regular, #606266);
}

.lang-menu-item:hover:not(:disabled) {
  background: var(--el-fill-color-light, #f5f7fa);
}

.lang-menu-item.is-current {
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
}

.lang-menu-item:disabled {
  cursor: default;
}

/* ---------- 窄屏抽屉入口 ---------- */
.header-nav-toggle-wrap {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
}

.header-nav-menu-btn {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 8px;
  color: var(--el-color-primary, #409eff);
}

/* ---------- 原生抽屉 ---------- */
.drawer-root {
  position: fixed;
  inset: 0;
  z-index: 3000;
}

.drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.drawer-panel {
  position: absolute;
  top: 0;
  inset-inline-end: 0;
  display: flex;
  flex-direction: column;
  width: min(320px, 88vw);
  height: 100%;
  background: var(--el-bg-color, #ffffff);
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.12);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.drawer-close {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 4px;
  color: var(--el-text-color-secondary, #909399);
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  overflow-y: auto;
}

.drawer-nav-item {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 11px 16px;
  font-size: 14px;
  font-family: inherit;
  text-align: start;
  color: var(--el-text-color-regular, #606266);
}

.drawer-nav-item:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.drawer-nav-item.is-active {
  color: var(--el-color-primary, #409eff);
  font-weight: 600;
  background: var(--el-fill-color-light, #f5f7fa);
}

/* ---------- 抽屉内语言选择 ---------- */
.drawer-lang {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.drawer-lang-title {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.drawer-lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lang-chip {
  appearance: none;
  cursor: pointer;
  padding: 5px 11px;
  font-size: 12px;
  font-family: inherit;
  border-radius: 4px;
  border: 1px solid var(--el-border-color, #dcdfe6);
  background: var(--el-bg-color, #ffffff);
  color: var(--el-text-color-regular, #606266);
}

.lang-chip.is-current {
  border-color: var(--el-color-primary, #409eff);
  background: var(--el-color-primary, #409eff);
  color: #fff;
}

/* ---------- 主体与页脚 ---------- */
.app-main {
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 24px 20px 40px;
}

.app-main--tool {
  max-width: 960px;
  margin-inline: auto;
}

.app-footer {
  padding: 16px 20px 24px;
  text-align: center;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
  background: var(--el-bg-color, #ffffff);
}
</style>
