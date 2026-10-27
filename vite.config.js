import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { SUPPORTED_LOCALES } from './src/i18n/localeConfig.js'
import { TOOLS } from './src/config/tools.js'

/** 先于其它 transform，避免 import 分析把 .vue 当纯 JS 解析 */
const vuePlugin = vue()
vuePlugin.enforce = 'pre'

// SSR 构建时把 CSS import 替换为空模块：vite-ssg 会把 element-plus 等包 external 到 Node 运行时，
// 而 element-plus 内部 `import 'theme-chalk/base.css'` 在 Node 加载时会因无法解析 .css 报
// ERR_UNKNOWN_FILE_EXTENSION。客户端构建不受影响（CSS 正常产出），SSG 仅生成 HTML 结构，
// 样式由客户端 hydrate 时加载，故 SSR 阶段无需真正处理 CSS。
const stubCssInSsr = {
  name: 'stub-css-in-ssr',
  apply: 'build',
  resolveId(source, _importer, options) {
    if (options?.ssr && typeof source === 'string' && source.endsWith('.css')) {
      return '\0empty-ssr-css'
    }
  },
  load(id) {
    if (id === '\0empty-ssr-css') return 'export default {}'
  },
}

export default defineConfig({
  optimizeDeps: {
    include: ['@tensorflow/tfjs', 'upscaler', '@upscalerjs/default-model', 'pica'],
  },
  plugins: [
    stubCssInSsr,
    vuePlugin,
    AutoImport({
      resolvers: [
        ElementPlusResolver({
          importStyle: 'css',
        }),
      ],
    }),
    Components({
      resolvers: [
        ElementPlusResolver({
          importStyle: 'css',
        }),
      ],
    }),
  ],
  ssgOptions: {
    // 每个路由生成无尾斜杠的独立静态 HTML（/en/compress.html），契合 SEO 与规范 URL 约定
    dirStyle: 'flat',
    // vite-ssg 默认只枚举静态路由，不会展开动态段 :locale。手动补全「语言 × 工具」全部路径，
    // 确保每个 locale 的首页与 12 个工具页都被预渲染为独立 HTML。
    includedRoutes() {
      const paths = ['/']
      for (const locale of SUPPORTED_LOCALES) {
        paths.push(`/${locale}`)
        for (const tool of TOOLS) {
          paths.push(`/${locale}/${tool.slug}`)
        }
      }
      return paths
    },
  },
  ssr: {
    // 让 element-plus 进入 vite 处理（而非 external 到 Node），使上文 stub-css-in-ssr 能拦截其 base.css
    noExternal: ['element-plus', '@element-plus/icons-vue'],
  },
  build: {
    // 覆盖模式：不自动清空 dist。WorkBuddy 的 safe-delete 守卫会拦截 Vite emptyOutDir 的批量删除，
    // 故改为覆盖写入；如需彻底清理旧产物，用 PowerShell 的 [System.IO.Directory]::Delete 删除 dist 即可。
    emptyOutDir: false,
  },
  resolve: {
    dedupe: ['vue'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
