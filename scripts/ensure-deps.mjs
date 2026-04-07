import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('..', import.meta.url)))
const vuePkg = join(root, 'node_modules', 'vue', 'package.json')
const vueCompiler = join(root, 'node_modules', 'vue', 'compiler-sfc', 'package.json')
const pluginVue = join(root, 'node_modules', '@vitejs', 'plugin-vue', 'package.json')

function die(msg) {
  console.error(msg)
  console.error(
    '\n[image-studio] 请在项目根目录执行：npm install（或 npm ci），勿使用仅含生产依赖的安装（例如 npm install --omit=dev）。\n',
  )
  process.exit(1)
}

if (!existsSync(vuePkg)) {
  die('\n[image-studio] 未找到 vue。')
}
if (!existsSync(vueCompiler)) {
  die('\n[image-studio] 未找到 vue/compiler-sfc（@vitejs/plugin-vue 需要完整安装 vue）。')
}
if (!existsSync(pluginVue)) {
  die('\n[image-studio] 未找到 @vitejs/plugin-vue（开发依赖缺失会导致无法解析 .vue 文件）。')
}
