// 临时：生成 src/components/ToolIcon.vue（内联 14 个图标 path，替代 @element-plus/icons-vue）
import { readFileSync, writeFileSync } from 'node:fs'

const icons = JSON.parse(
  readFileSync('D:/MyDevelop/JSDevelop/image-studio/.workbuddy/icons.json', 'utf8'),
)

const body = Object.entries(icons)
  .map(([k, v]) => `  ${k}: '${v[0]}',`)
  .join('\n')

const vue = `<script setup>
/**
 * 内联图标：把 @element-plus/icons-vue 中实际用到的 14 个图标的 path 直接内嵌。
 *
 * 背景：EP 图标是「一个图标 = 一个 Vue 组件」，单独看很小，但本项目在首页一次性用到
 * 12 个（工具卡片）+ ImagePicker 1 个 + RotateView 1 个，全部静态 import 会把图标库
 * 与 el-icon 容器拖进首屏。图标属于**首屏展示内容**，无法动态延迟加载，因此改为
 * 内联 path（纯字符串，共约 4.8KB 未压缩），彻底移除 @element-plus/icons-vue 依赖。
 */
const props = defineProps({
  /** @see src/config/tools.js 的 icon 字段（PascalCase，与 EP 命名保持一致） */
  name: { type: String, required: true },
  size: { type: [Number, String], default: 28 },
})

const PATHS = {
${body}
}
<\/script>

<template>
  <svg
    class="tool-icon"
    :width="size"
    :height="size"
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path v-if="PATHS[props.name]" :d="PATHS[props.name]" fill="currentColor" />
  </svg>
</template>

<style scoped>
.tool-icon {
  display: block;
  flex-shrink: 0;
}
</style>
`

writeFileSync('D:/MyDevelop/JSDevelop/image-studio/src/components/ToolIcon.vue', vue, 'utf8')
console.log('written, bytes =', vue.length)
