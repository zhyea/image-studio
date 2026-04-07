import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

/** 先于其它 transform，避免 import 分析把 .vue 当纯 JS 解析 */
const vuePlugin = vue()
vuePlugin.enforce = 'pre'

export default defineConfig({
  optimizeDeps: {
    include: ['@tensorflow/tfjs', 'upscaler', '@upscalerjs/default-model', 'pica'],
  },
  plugins: [
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
  resolve: {
    dedupe: ['vue'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
