import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SUPPORTED_LOCALES,
  TOOL_SLUGS,
  HREFLANG,
  resolveSeoRequest,
  redirectTargetForHost,
  default as seoHandler,
} from '../netlify/edge-functions/seo-canonical.js'
import { TOOLS } from '../src/config/tools.js'
import { SUPPORTED_LOCALES as APP_LOCALES, localeMeta } from '../src/i18n/localeConfig.js'

const HOST = 'image.chobit.org'

function req(pathname, hostname = HOST, protocol = 'https:', acceptLanguage) {
  return resolveSeoRequest({ hostname, pathname, protocol }, acceptLanguage)
}

// ---------- 清单与应用保持一致（漂移即失败） ----------

test('语言清单与 src/i18n/localeConfig.js 完全一致', () => {
  assert.deepEqual(SUPPORTED_LOCALES, APP_LOCALES)
})

test('工具 slug 清单与 src/config/tools.js 完全一致', () => {
  const fromApp = TOOLS.map((t) => t.slug)
  assert.equal(TOOL_SLUGS.length, fromApp.length)
  assert.deepEqual([...TOOL_SLUGS].sort(), [...fromApp].sort())
})

test('hreflang 与 localeMeta 一致', () => {
  for (const code of APP_LOCALES) {
    assert.equal(HREFLANG[code], localeMeta(code).hreflang, `locale=${code}`)
  }
})

// ---------- 域名规范化 ----------

test('主域名不重定向', () => {
  assert.equal(redirectTargetForHost('image.chobit.org'), null)
  assert.equal(redirectTargetForHost('IMAGE.CHOBIT.ORG'), null)
})

test('netlify.app 默认子域收敛到主域', () => {
  assert.equal(redirectTargetForHost('image-studio.netlify.app'), 'https://image.chobit.org')
})

test('deploy preview / branch deploy 不被重定向', () => {
  assert.equal(redirectTargetForHost('deploy-preview-42--image-studio.netlify.app'), null)
  assert.equal(redirectTargetForHost('feat-x--image-studio.netlify.app'), null)
})

test('本地与 localhost 不重定向', () => {
  assert.equal(redirectTargetForHost('localhost'), null)
  assert.equal(redirectTargetForHost('127.0.0.1'), null)
})

// ---------- 路径规范化 ----------

test('已规范路径返回 200 页', () => {
  const r = req('/zh/compress')
  assert.equal(r.kind, 'page')
  assert.equal(r.locale, 'zh')
  assert.equal(r.slug, 'compress')
})

test('语言首页也为有效页', () => {
  const r = req('/en')
  assert.equal(r.kind, 'page')
  assert.equal(r.slug, '')
})

test('大小写变体 301 到规范 URL', () => {
  assert.equal(req('/ZH/Compress').kind, 'redirect')
  assert.equal(req('/ZH/Compress').location, 'https://image.chobit.org/zh/compress')
})

test('尾斜杠 301 去除', () => {
  assert.equal(req('/zh/compress/').location, 'https://image.chobit.org/zh/compress')
})

test('重复斜杠 301 折叠', () => {
  assert.equal(req('/zh//compress').location, 'https://image.chobit.org/zh/compress')
})

test('http 301 到 https', () => {
  assert.equal(req('/zh', HOST, 'http:').location, 'https://image.chobit.org/zh')
})

test('netlify 子域访问工具页 301 到主域', () => {
  const r = req('/zh/compress', 'image-studio.netlify.app')
  assert.equal(r.kind, 'redirect')
  assert.equal(r.location, 'https://image.chobit.org/zh/compress')
})

test('静态资源放行，根路径按 Accept-Language 边缘层 301 落地', () => {
  assert.equal(req('/assets/index-C2s1Um8i.js').kind, 'passthrough')
  assert.equal(req('/favicon.svg').kind, 'passthrough')
  assert.equal(req('/sitemap.xml').kind, 'passthrough')
  // 公网根路径默认回落 en
  assert.equal(req('/').kind, 'redirect')
  assert.equal(req('/').location, 'https://image.chobit.org/en')
  // 中文浏览器落地 /zh，法文落地 /fr
  assert.equal(req('/', HOST, 'https:', 'zh-CN,zh;q=0.9,en;q=0.8').location, 'https://image.chobit.org/zh')
  assert.equal(req('/', HOST, 'https:', 'fr-FR,fr;q=0.9').location, 'https://image.chobit.org/fr')
  // 不支持语种（it）回落 en
  assert.equal(req('/', HOST, 'https:', 'it-IT,it;q=0.9').location, 'https://image.chobit.org/en')
})

test('localhost 下根路径放行（便于本地 Netlify CLI 预览，不强制跳转）', () => {
  const r = req('/', 'localhost', 'http:')
  assert.equal(r.kind, 'passthrough')
})

test('非白名单路径判定为不存在（返回真 404，消除重复空间）', () => {
  assert.equal(req('/random-garbage').kind, 'not-found')
  assert.equal(req('/zh/unknown-tool').kind, 'not-found')
  assert.equal(req('/zh/compress/extra').kind, 'not-found')
  assert.equal(req('/it/compress').kind, 'not-found')
})

test('localhost 下正常渲染工具页，便于本地 Netlify CLI 验证', () => {
  const r = req('/zh/blur', 'localhost', 'http:')
  assert.equal(r.kind, 'page')
  assert.equal(r.slug, 'blur')
})

test('localhost 下的大小写变体仍在 http 协议内重定向', () => {
  const r = req('/ZH/Compress', 'localhost', 'http:')
  assert.equal(r.kind, 'redirect')
  assert.equal(r.location, 'http://localhost/zh/compress')
})

// ---------- 白名单页面放行（head 已由 SSG 写入静态 HTML，边缘层不再注入） ----------

test('白名单页面由 handler 放行（返回 undefined，交 Netlify 静态服务预渲染 HTML）', async () => {
  const res = await seoHandler(new Request('https://image.chobit.org/zh/compress'))
  assert.equal(res, undefined, '已规范页面必须 passthrough，不得注入 head 或返回 404')
})

test('语言首页同样放行', async () => {
  const res = await seoHandler(new Request('https://image.chobit.org/en'))
  assert.equal(res, undefined)
})

test('根路径端到端按 Accept-Language 301 落地（默认 en）', async () => {
  const res = await seoHandler(new Request('https://image.chobit.org/'))
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), 'https://image.chobit.org/en')
})

test('根路径端到端带 zh Accept-Language 301 到 /zh', async () => {
  const res = await seoHandler(new Request('https://image.chobit.org/', { headers: { 'accept-language': 'zh-CN,zh;q=0.9' } }))
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), 'https://image.chobit.org/zh')
})

test('handler 不设置 link 头（避免与静态 HTML 既有 canonical 重复）', async () => {
  const res = await seoHandler(new Request('https://image.chobit.org/zh/compress'))
  assert.equal(res, undefined)
  // 放行时无任何响应头被注入；若未来误加 head 注入，此断言会捕捉
})

// ---------- 端到端：真实走一遍 handler ----------

test('404 响应为真 404 + noindex，且不含 canonical/hreflang', async () => {
  const res = await seoHandler(new Request('https://image.chobit.org/zh/nope-123'))
  assert.equal(res.status, 404)
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow')
  assert.equal(res.headers.get('link'), null)
  const body = await res.text()
  assert.ok(!body.includes('rel="canonical"'))
  assert.ok(!body.includes('rel="alternate"'))
})

test('大小写变体端到端 301 到规范 URL', async () => {
  const res = await seoHandler(new Request('https://image.chobit.org/ZH/Compress/'))
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), 'https://image.chobit.org/zh/compress')
})

test('http 工具页端到端 301 到 https 主域', async () => {
  const res = await seoHandler(new Request('http://image-studio.netlify.app/zh/compress'))
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('location'), 'https://image.chobit.org/zh/compress')
})
