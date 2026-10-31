// 临时：从 @element-plus/icons-vue 提取指定图标的 path 数据，用于内联（去掉 EP 图标依赖）
import { readFileSync } from 'node:fs'

const src = readFileSync(
  'D:/MyDevelop/JSDevelop/image-studio/node_modules/@element-plus/icons-vue/dist/index.js',
  'utf8',
)
const want = [
  'Histogram', 'ZoomIn', 'MagicStick', 'ScaleToOriginal', 'Crop', 'PictureFilled',
  'RefreshRight', 'EditPen', 'ChatLineRound', 'DocumentCopy', 'Hide', 'Grid',
  'UploadFilled', 'Odometer',
]

// 按 `name: "Xxx"` 切块，块内收集所有 d: "..." （EP 图标 1024 viewBox，可能有多个 path）
const out = {}
for (const name of want) {
  const start = src.indexOf(`name: "${name}"`)
  if (start === -1) {
    console.error('未找到', name)
    continue
  }
  // 向前找到该组件的 var/const 定义起点
  const seg = src.slice(start, start + 2000)
  const ds = [...seg.matchAll(/d:\s*"([^"]+)"/g)].map((m) => m[1])
  // 只取属于本组件的：截取到下一个 name: " 之前
  const nextName = seg.indexOf('name: "', 10)
  const limit = nextName === -1 ? seg.length : nextName
  const real = [...seg.slice(0, limit).matchAll(/d:\s*"([^"]+)"/g)].map((m) => m[1])
  out[name] = real.length ? real : ds.slice(0, 1)
}

console.log(JSON.stringify(out, null, 2))
console.error('\n各图标 path 数：')
for (const [k, v] of Object.entries(out)) console.error(k.padEnd(20), v.length, '| 首段长度', v[0]?.length)
