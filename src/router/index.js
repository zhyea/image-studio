import { createRouter, createWebHistory } from 'vue-router'
import i18n, { SUPPORTED_LOCALES, LOCALE_PATH_PATTERN, DEFAULT_LOCALE } from '../i18n'
import { applyRouteSeo } from '../seo/updateHead'

const LocaleLayout = () => import('../views/LocaleLayout.vue')
const HomeView = () => import('../views/HomeView.vue')
const CompressView = () => import('../views/CompressView.vue')
const ResizeView = () => import('../views/ResizeView.vue')
const CropView = () => import('../views/CropView.vue')
const ConvertJpgView = () => import('../views/ConvertJpgView.vue')
const RotateView = () => import('../views/RotateView.vue')
const WatermarkView = () => import('../views/WatermarkView.vue')
const MemeView = () => import('../views/MemeView.vue')
const UpscaleView = () => import('../views/UpscaleView.vue')
const RemoveBgView = () => import('../views/RemoveBgView.vue')
const HtmlToImageView = () => import('../views/HtmlToImageView.vue')
const BlurRegionView = () => import('../views/BlurRegionView.vue')
const WebSkeletonView = () => import('../views/WebSkeletonView.vue')
const NotFoundView = () => import('../views/NotFoundView.vue')

function detectSystemLocale() {
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

const localizedChildren = [
  { path: '', name: 'home', component: HomeView, meta: { seoPage: 'home' } },
  { path: 'compress', name: 'compress', component: CompressView, meta: { seoPage: 'compress' } },
  { path: 'resize', name: 'resize', component: ResizeView, meta: { seoPage: 'resize' } },
  { path: 'crop', name: 'crop', component: CropView, meta: { seoPage: 'crop' } },
  { path: 'convert-jpg', name: 'convert-jpg', component: ConvertJpgView, meta: { seoPage: 'convertJpg' } },
  { path: 'rotate', name: 'rotate', component: RotateView, meta: { seoPage: 'rotate' } },
  { path: 'watermark', name: 'watermark', component: WatermarkView, meta: { seoPage: 'watermark' } },
  { path: 'meme', name: 'meme', component: MemeView, meta: { seoPage: 'meme' } },
  { path: 'upscale', name: 'upscale', component: UpscaleView, meta: { seoPage: 'upscale' } },
  { path: 'remove-bg', name: 'remove-bg', component: RemoveBgView, meta: { seoPage: 'removeBg' } },
  { path: 'html-to-image', name: 'html-to-image', component: HtmlToImageView, meta: { seoPage: 'htmlToImage' } },
  { path: 'blur', name: 'blur', component: BlurRegionView, meta: { seoPage: 'blur' } },
  { path: 'web-skeleton', name: 'web-skeleton', component: WebSkeletonView, meta: { seoPage: 'webSkeleton' } },
  { path: ':pathMatch(.*)*', name: 'not-found', component: NotFoundView, meta: { seoPage: 'notFound' } },
]

const routes = [
  { path: '/', redirect: () => `/${detectSystemLocale()}` },
  {
    path: `/:locale(${LOCALE_PATH_PATTERN})`,
    component: LocaleLayout,
    children: localizedChildren,
  },
  { path: '/:pathMatch(.*)*', name: 'not-found-global', component: NotFoundView, meta: { seoPage: 'notFound' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const loc = to.params.locale
  if (loc && SUPPORTED_LOCALES.includes(loc)) {
    i18n.global.locale.value = loc
  }
})

router.afterEach((to) => {
  applyRouteSeo(to, i18n.global)
})

export default router
