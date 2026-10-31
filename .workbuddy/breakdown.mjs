// 临时量测：拆解单个页面初始加载的 JS chunk 构成（gzip）
import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const DIST = 'D:/MyDevelop/JSDevelop/image-studio/dist'
const target = process.argv[2] || 'en.html'
const html = readFileSync(join(DIST, target), 'utf8')
const js = new Set()
for (const m of html.matchAll(/<script[^>]*\ssrc="(\/assets\/[^"]+\.js)"/g)) js.add(m[1])
for (const m of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="(\/assets\/[^"]+\.js)"/g)) js.add(m[1])

const list = []
for (const f of js) {
  const abs = join(DIST, f.replace(/^\//, ''))
  const raw = readFileSync(abs)
  list.push({ f, raw: raw.length, gz: gzipSync(raw, { level: 9 }).length, text: raw.toString('utf8') })
}
list.sort((a, b) => b.gz - a.gz)
console.log(`=== ${target} 初始 JS 构成（按 gz 降序）===`)
let tg = 0, tr = 0
for (const it of list) {
  tg += it.gz; tr += it.raw
  console.log(
    String(Math.round(it.gz / 1024)).padStart(4) + 'KB gz',
    String(Math.round(it.raw / 1024)).padStart(5) + 'KB raw ',
    it.f.replace('/assets/', '').padEnd(38),
    '| el-' + (it.text.match(/el-[a-z-]+/g) || []).length,
    '| ' + (it.text.length ? '' : ''),
  )
}
console.log('总计', Math.round(tg / 1024) + 'KB gz /', Math.round(tr / 1024) + 'KB raw，文件数', list.length)

// 猜每个 chunk 的来源：看它含哪些特征串
console.log('\n=== 特征识别 ===')
const marks = {
  'vue-runtime': ['createRenderer', 'Teleport', 'Suspense'],
  '@unhead/vue': ['unhead', 'useHead', 'renderSSRHead'],
  'vue-router': ['createWebHistory', 'RouterView', 'router-view'],
  'i18n(自研)': ['liteI18n'],
  'element-plus': ['el-icon', 'element-plus', 'ElForm', 'useZIndex'],
  'ep-locale': ['el.', 'name:'],
  'tensorflow/upscaler': ['tfjs', 'upscaler'],
}
for (const it of list) {
  const hits = []
  for (const [k, arr] of Object.entries(marks)) {
    if (arr.some((s) => it.text.includes(s))) hits.push(k)
  }
  console.log(it.f.replace('/assets/', '').padEnd(38), hits.join(', ') || '(无特征)')
}
