import { LOCALE_PATH_PATTERN } from '../i18n/localeConfig.js'

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

// 根路径直接渲染默认语言首页（SSG 预渲染为 index.html，canonical 指向 /en）。
// 客户端语言自动落地由 App.vue 的 onMounted 按浏览器首选语言跳转，避免 SSG 空渲染。
const routes = [
  {
    path: '/',
    component: LocaleLayout,
    children: [{ path: '', name: 'home-root', component: HomeView, meta: { seoPage: 'home' } }],
  },
  {
    path: `/:locale(${LOCALE_PATH_PATTERN})`,
    component: LocaleLayout,
    children: localizedChildren,
  },
  { path: '/:pathMatch(.*)*', name: 'not-found-global', component: NotFoundView, meta: { seoPage: 'notFound' } },
]

export default routes
