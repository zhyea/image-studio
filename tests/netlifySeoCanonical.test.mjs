import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SUPPORTED_LOCALES,
  TOOL_SLUGS,
  HREFLANG,
  resolveSeoRequest,
  redirectTargetForHost,
  buildHeadTags,
  buildLinkHeader,
  default as seoHandler,
} from '../netlify/edge-functions/seo-canonical.js'
import { TOOLS } from '../src/config/tools.js'
import { SUPPORTED_LOCALES as APP_LOCALES, localeMeta } from '../src/i18n/localeConfig.js'

const HOST = 'image.chobit.org'

function req(pathname, hostname = HOST, protocol = 'https:') {
  return resolveSeoRequest({ hostname, pathname, protocol })
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

test('静态资源与根路径放行', () => {
  assert.equal(req('/assets/index-C2s1Um8i.js').kind, 'passthrough')
  assert.equal(req('/favicon.svg').kind, 'passthrough')
  assert.equal(req('/sitemap.xml').kind, 'passthrough')
  assert.equal(req('/').kind, 'passthrough')
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

// ---------- canonical / hreflang 标签 ----------

test('head 标签含 canonical 与全部语种 alternate', () => {
  const html = buildHeadTags('zh', 'compress')
  assert.match(html, /<link rel="canonical" href="https:\/\/image\.chobit\.org\/zh\/compress">/)
  for (const code of APP_LOCALES) {
    assert.ok(
      html.includes(`href="https://image.chobit.org/${code}/compress"`),
      `缺少 ${code} 的 alternate`,
    )
  }
  assert.ok(html.includes('hreflang="x-default"'))
})

test('head 标签自引用包含自身语种', () => {
  const html = buildHeadTags('ja', 'upscale')
  assert.ok(html.includes(`hreflang="ja" href="https://image.chobit.org/ja/upscale"`))
})

test('语言首页的 canonical 无尾斜杠', () => {
  const html = buildHeadTags('ru', '')
  assert.match(html, /<link rel="canonical" href="https:\/\/image\.chobit\.org\/ru">/)
})

test('Link 头以 canonical 打头且覆盖所有语种', () => {
  const header = buildLinkHeader('de', 'crop')
  assert.ok(header.startsWith('<https://image.chobit.org/de/crop>; rel="canonical"'))
  for (const code of APP_LOCALES) {
    assert.ok(header.includes(`rel="alternate"; hreflang="${HREFLANG[code]}"`), `缺少 ${code}`)
  }
  assert.ok(header.includes('hreflang="x-default"'))
})

// ---------- 端到端：真实走一遍 handler ----------

function withMockedIndexHtml(fn) {
  const realFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response('<html><head></head><body><div id="app"></div></body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', etag: 'W/"up"' },
    })
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      globalThis.fetch = realFetch
    })
}

test('白名单页面返回 200 并服务端注入 canonical 与 hreflang', async () => {
  await withMockedIndexHtml(async () => {
    const res = await seoHandler(new Request('https://image.chobit.org/zh/compress'))
    const body = await res.text()
    assert.equal(res.status, 200)
    assert.match(res.headers.get('link'), /rel="canonical"/)
    assert.match(res.headers.get('x-robots-tag'), /index/)
    assert.ok(body.includes('<link rel="canonical" href="https://image.chobit.org/zh/compress">'))
    assert.ok(body.includes('</head>'))
    assert.equal(res.headers.get('etag'), null, '改写过 body 后旧 etag 必须失效')
  })
})

test('404 响应不带 canonical/hreflang，且为真 404 + noindex', async () => {
  await withMockedIndexHtml(async () => {
    const res = await seoHandler(new Request('https://image.chobit.org/zh/nope-123'))
    const body = await res.text()
    assert.equal(res.status, 404)
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow')
    assert.equal(res.headers.get('link'), null)
    assert.ok(!body.includes('rel="canonical"'))
    assert.ok(!body.includes('rel="alternate"'))
  })
})

test('大小写变体端到端 301 到规范 URL', async () => {
  await withMockedIndexHtml(async () => {
    const res = await seoHandler(new Request('https://image.chobit.org/ZH/Compress/'))
    assert.equal(res.status, 301)
    assert.equal(res.headers.get('location'), 'https://image.chobit.org/zh/compress')
  })
})
