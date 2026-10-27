<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowDown, Menu } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import enLocale from 'element-plus/es/locale/lang/en'
import esLocale from 'element-plus/es/locale/lang/es'
import frLocale from 'element-plus/es/locale/lang/fr'
import deLocale from 'element-plus/es/locale/lang/de'
import jaLocale from 'element-plus/es/locale/lang/ja'
import ptBrLocale from 'element-plus/es/locale/lang/pt-br'
import ruLocale from 'element-plus/es/locale/lang/ru'
import arLocale from 'element-plus/es/locale/lang/ar'
import { TOOLS } from './config/tools'
import { DEFAULT_LOCALE, LOCALE_META, SUPPORTED_LOCALES } from './i18n/localeConfig.js'
import i18n from './i18n'
import { useHead } from '@unhead/vue'
import { buildHeadConfig } from './seo/headConfig'

const EL_LOCALE_BY_CODE = {
  zh: zhCn,
  en: enLocale,
  es: esLocale,
  fr: frLocale,
  de: deLocale,
  ja: jaLocale,
  pt: ptBrLocale,
  ru: ruLocale,
  ar: arLocale,
}

/** 小于等于此宽度时顶栏横向菜单折叠为抽屉 */
const COMPACT_NAV_MAX_PX = 540

function readCompactNavMatch() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${COMPACT_NAV_MAX_PX}px)`).matches
}

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

// 声明式 SEO head：vite-ssg 在构建期把每个路由的 title/meta/canonical/hreflang/json-ld 写入静态 HTML
useHead(() => buildHeadConfig(route, i18n))

const localeParam = computed(() => route.params.locale || DEFAULT_LOCALE)
const isCompactNav = ref(readCompactNavMatch())
const drawerVisible = ref(false)

const activeMenu = computed(() => {
  const n = route.name
  if (n === 'home') return 'home'
  if (typeof n === 'string' && TOOLS.some((item) => item.name === n)) return n
  return ''
})

const elLocale = computed(() => EL_LOCALE_BY_CODE[localeParam.value] ?? zhCn)

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

function detectClientLocale() {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  const candidates = [...(navigator.languages || []), navigator.language]
    .filter((v) => typeof v === 'string')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  for (const lang of candidates) {
    const short = lang.split('-')[0]
    if (SUPPORTED_LOCALES.includes(short)) return short
  }
  return DEFAULT_LOCALE
}

onMounted(() => {
  updateCompactNav()
  window.addEventListener('resize', onWindowResize)
  // 客户端语言自动落地：根路径按浏览器首选语言跳转（保留 SPA 体验，不影响 SSG 静态内容）
  if (route.path === '/' && detectClientLocale() !== DEFAULT_LOCALE) {
    router.replace(`/${detectClientLocale()}`)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
})

watch(
  () => [route.name, route.params.locale, route.path],
  () => {
    drawerVisible.value = false
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

const menuKey = computed(() => `${locale.value}-${activeMenu.value}`)

const drawerMenuKey = computed(() => `drawer-${locale.value}-${activeMenu.value}`)

const isHomePage = computed(() => route.name === 'home')
const isNotFoundPage = computed(() => route.name === 'not-found' || route.name === 'not-found-global')
</script>

<template>
  <el-config-provider :locale="elLocale">
    <el-container class="app-shell">
      <el-header class="app-header" height="56px">
        <div class="brand" @click="goHome">
          <img class="brand-logo" src="/logo.svg" width="36" height="36" alt="" />
          <span class="brand-text">Image Studio</span>
        </div>
        <div v-if="!isCompactNav" class="header-menu-wrap">
          <el-menu
            :key="menuKey"
            :default-active="activeMenu"
            mode="horizontal"
            class="header-menu"
            menu-trigger="click"
            @select="onMenuSelect"
          >
            <el-menu-item index="home">{{ t('nav.home') }}</el-menu-item>
            <el-menu-item v-for="item in TOOLS" :key="'v-' + item.name" :index="item.name">
              {{ t(`tools.${item.slug}.title`) }}
            </el-menu-item>
          </el-menu>
        </div>
        <div class="header-lang-wrap">
          <el-dropdown trigger="click" :teleported="true" @command="switchLocale">
            <el-button
              type="primary"
              link
              class="lang-trigger"
              :aria-label="t('nav.switchLanguage')"
            >
              <span class="lang-trigger-label">{{ LOCALE_META[localeParam].label }}</span>
              <el-icon class="lang-trigger-caret"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="code in SUPPORTED_LOCALES"
                  :key="code"
                  :command="code"
                  :disabled="code === localeParam"
                >
                  {{ LOCALE_META[code].label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div v-if="isCompactNav" class="header-nav-toggle-wrap">
          <el-button
            type="primary"
            link
            class="header-nav-menu-btn"
            :aria-label="t('nav.openMenu')"
            @click="drawerVisible = true"
          >
            <el-icon :size="24"><Menu /></el-icon>
          </el-button>
        </div>
        <el-drawer
          v-model="drawerVisible"
          :title="t('nav.menuTitle')"
          direction="rtl"
          size="min(320px, 88vw)"
          append-to-body
          class="app-nav-drawer"
        >
          <el-menu
            :key="drawerMenuKey"
            :default-active="activeMenu"
            class="app-nav-drawer-menu"
            @select="onDrawerMenuSelect"
          >
            <el-menu-item index="home">{{ t('nav.home') }}</el-menu-item>
            <el-menu-item v-for="item in TOOLS" :key="'d-' + item.name" :index="item.name">
              {{ t(`tools.${item.slug}.title`) }}
            </el-menu-item>
          </el-menu>
          <div class="drawer-lang">
            <p class="drawer-lang-title">{{ t('nav.switchLanguage') }}</p>
            <div class="drawer-lang-chips">
              <el-button
                v-for="code in SUPPORTED_LOCALES"
                :key="'lg-' + code"
                size="small"
                :type="code === localeParam ? 'primary' : 'default'"
                @click="switchLocale(code); drawerVisible = false"
              >
                {{ LOCALE_META[code].label }}
              </el-button>
            </div>
          </div>
        </el-drawer>
      </el-header>
      <el-main class="app-main" :class="{ 'app-main--tool': !isHomePage && !isNotFoundPage }">
        <router-view />
      </el-main>
      <el-footer class="app-footer" height="auto">
        <p>{{ t('footer.line') }}</p>
      </el-footer>
    </el-container>
  </el-config-provider>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--studio-bg);
}

.app-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(16px / 3);
  padding: 0 20px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
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
  color: var(--el-text-color-primary);
}

.header-lang-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.lang-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: min(140px, 32vw);
  padding: 4px 8px !important;
}

.lang-trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lang-trigger-caret {
  flex-shrink: 0;
}

.header-nav-toggle-wrap {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
}

.header-nav-menu-btn {
  padding: 8px !important;
}

.header-menu-wrap {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.header-menu {
  width: 100%;
  min-width: 0;
  border-bottom: none !important;
  justify-content: flex-end;
  background: transparent;
}

.header-menu :deep(.el-menu-item) {
  padding: 0 14px;
  font-size: 14px;
}

.header-menu :deep(.el-menu-item.is-active) {
  border-bottom-width: 2px;
}

.app-main {
  margin: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 24px 20px 40px;
}

.app-main--tool {
  max-width: 960px;
  margin-left: auto;
  margin-right: auto;
}

.app-footer {
  padding: 16px 20px 24px;
  text-align: center;
  border-top: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 13px;
  background: var(--el-bg-color);
}
</style>

<style>
.app-nav-drawer .el-drawer__body {
  padding: 0;
}

.app-nav-drawer-menu.el-menu {
  border-right: none;
}

.drawer-lang {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.drawer-lang-title {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.drawer-lang-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
