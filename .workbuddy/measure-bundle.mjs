// 临时量测：统计每个预渲染 HTML 的「初始加载」JS/CSS 体积（gzip）
import { readFileSync, statSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, basename } from 'node:path'

const DIST = 'D:/MyDevelop/JSDevelop/image-studio/dist'
const gzCache = new Map()
function gzSize(rel) {
  if (gzCache.has(rel)) return gzCache.get(rel)
  const buf = readFileSync(join(DIST, rel))
  const n = gzipSync(buf, { level: 9 }).length
  gzCache.set(rel, n)
  return n
}

function collectHtml(dir, prefix, out) {
  for (const e of readdirSync(join(DIST, dir), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) collectHtml(rel, rel, out)
    else if (e.name.endsWith('.html')) out.push(rel)
  }
}
const pages = []
collectHtml('', '', pages)
pages.sort()

const rows = []
for (const p of pages) {
  const html = readFileSync(join(DIST, p), 'utf8')
  const js = new Set()
  const css = new Set()
  // 入口 script
  for (const m of html.matchAll(/<script[^>]*\ssrc="(\/assets\/[^"]+\.js)"/g)) js.add(m[1])
  // modulepreload（会被 fetch，计入初始）
  for (const m of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="(\/assets\/[^"]+\.js)"/g)) js.add(m[1])
  for (const m of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"/g)) css.add(m[1])
  let jsGz = 0, jsRaw = 0
  for (const f of js) {
    jsGz += gzSize(f.replace(/^\//, ''))
    jsRaw += statSync(join(DIST, f.replace(/^\//, ''))).size
  }
  let cssGz = 0, cssRaw = 0
  for (const f of css) {
    cssGz += gzSize(f.replace(/^\//, ''))
    cssRaw += statSync(join(DIST, f.replace(/^\//, ''))).size
  }
  const langM = html.match(/<html lang="([^"]*)" dir="([^"]*)">/)
  const titleM = html.match(/<title>([^<]*)<\/title>/)
  rows.push({ page: p, js: js.size, jsGz, jsRaw, cssGz, cssRaw, lang: langM?.[1], dir: langM?.[2], title: (titleM?.[1] || '').slice(0, 28) })
}

const fmt = (n) => String(Math.round(n / 1024)) + 'KB'
console.log('page'.padEnd(26), 'lang'.padEnd(8), 'jgz'.padStart(7), 'jraw'.padStart(8), 'cgz'.padStart(7), 'ttl'.padStart(7), 'title')
for (const r of rows) {
  console.log(
    r.page.padEnd(26),
    (r.lang + '/' + r.dir).padEnd(8),
    fmt(r.jsGz).padStart(7),
    fmt(r.jsRaw).padStart(8),
    fmt(r.cssGz).padStart(7),
    fmt(r.jsGz + r.cssGz).padStart(7),
    r.title,
  )
}
const avg = (k) => rows.reduce((a, b) => a + b[k], 0) / rows.length
console.log('\n页数', rows.length, '| 平均 JS gz', fmt(avg('jsGz')), '| 平均 JS raw', fmt(avg('jsRaw')), '| 平均 CSS gz', fmt(avg('cssGz')), '| 平均总 gz', fmt(avg('jsGz') + avg('cssGz')))
// 语种串位检测
// 与 src/i18n/localeConfig.js 的 LOCALE_META.bcp47 保持一致
const expect = { zh: 'zh-CN', en: 'en', es: 'es', fr: 'fr', de: 'de', ja: 'ja', pt: 'pt', ru: 'ru', ar: 'ar' }
const dirExpect = { ar: 'rtl' }
const bad = []
for (const r of rows) {
  const loc = r.page.split('/')[0].replace('.html', '')
  const want = expect[loc]
  if (!want) { bad.push(`${r.page}: 未知语种 ${loc}`); continue }
  if (r.lang !== want) bad.push(`${r.page}: lang=${r.lang} 期望 ${want}`)
  const wd = dirExpect[loc] || 'ltr'
  if (r.dir !== wd) bad.push(`${r.page}: dir=${r.dir} 期望 ${wd}`)
}
console.log('\nlang/dir 串位数 =', bad.length)
bad.slice(0, 20).forEach((b) => console.log('  ', b))
