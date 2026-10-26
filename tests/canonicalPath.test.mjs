import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalPath } from '../src/seo/canonicalPath.js'

test('已规范路径原样返回', () => {
  assert.equal(canonicalPath('/zh/compress'), '/zh/compress')
  assert.equal(canonicalPath('/en/upscale'), '/en/upscale')
})

test('语言层面的首页路径', () => {
  assert.equal(canonicalPath('/ar'), '/ar')
})

test('大小写变体收敛到唯一 canonical', () => {
  assert.equal(canonicalPath('/ZH/Compress'), '/zh/compress')
  assert.equal(canonicalPath('/Ja/Web-Skeleton'), '/ja/web-skeleton')
})

test('结尾斜杠去除', () => {
  assert.equal(canonicalPath('/zh/compress/'), '/zh/compress')
})

test('重复斜杠折叠', () => {
  assert.equal(canonicalPath('/zh//compress'), '/zh/compress')
})

test('query 与 hash 不影响 canonical', () => {
  assert.equal(canonicalPath('/zh/compress?utm_source=x'), '/zh/compress')
  assert.equal(canonicalPath('/zh/compress#top'), '/zh/compress')
})

test('根路径回退到默认语言', () => {
  assert.equal(canonicalPath('/'), '/en')
  assert.equal(canonicalPath(''), '/en')
})

test('不支持的语言回退到默认语言', () => {
  assert.equal(canonicalPath('/it/compress'), '/en/compress')
})

test('百分号编码按 UTF-8 解码后再参与规范化', () => {
  assert.equal(canonicalPath('/zh/%E4%B8%AD'), '/zh/中')
})

test('不存在的深路径保留自指，避免误指向其它页面', () => {
  assert.equal(canonicalPath('/zh/a/b'), '/zh/a/b')
})

test('规范化的幂等性', () => {
  const once = canonicalPath('/De/Remove-BG/')
  assert.equal(canonicalPath(once), once)
})

test('十二个工具页的 canonical 均为小写且无尾斜杠', () => {
  for (const slug of ['compress', 'resize', 'crop', 'convert-jpg', 'rotate', 'watermark', 'meme', 'upscale', 'remove-bg', 'html-to-image', 'blur', 'web-skeleton']) {
    const out = canonicalPath(`/ZH/${slug.toUpperCase()}/`)
    assert.equal(out, `/zh/${slug}`)
  }
})
