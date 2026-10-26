import test from 'node:test'
import assert from 'node:assert/strict'
import { inferOutputMime, mimeToExt, inferOutput, JPEG_QUALITY } from '../src/utils/outputFormat.js'

test('explicit jpeg format wins over file type', () => {
  assert.equal(inferOutputMime({ type: 'image/png' }, { format: 'jpeg' }), 'image/jpeg')
})

test('explicit png format wins over file type', () => {
  assert.equal(inferOutputMime({ type: 'image/jpeg' }, { format: 'png' }), 'image/png')
})

test('infers jpeg from jpg extension', () => {
  assert.equal(inferOutputMime({ type: 'image/jpg' }), 'image/jpeg')
})

test('infers jpeg from jpeg type', () => {
  assert.equal(inferOutputMime({ type: 'image/jpeg' }), 'image/jpeg')
})

test('infers png', () => {
  assert.equal(inferOutputMime({ type: 'image/png' }), 'image/png')
})

test('infers webp when no explicit format', () => {
  assert.equal(inferOutputMime({ type: 'image/webp' }), 'image/webp')
})

test('falls back to png for unknown / missing type', () => {
  assert.equal(inferOutputMime({ type: 'image/gif' }), 'image/png')
  assert.equal(inferOutputMime({}), 'image/png')
  assert.equal(inferOutputMime(null), 'image/png')
})

test('mimeToExt maps jpeg/png/webp', () => {
  assert.equal(mimeToExt('image/jpeg'), 'jpg')
  assert.equal(mimeToExt('image/webp'), 'webp')
  assert.equal(mimeToExt('image/png'), 'png')
})

test('inferOutput returns ext + jpeg quality only for jpeg', () => {
  const j = inferOutput({ type: 'image/jpeg' })
  assert.equal(j.ext, 'jpg')
  assert.equal(j.quality, JPEG_QUALITY)

  const p = inferOutput({ type: 'image/png' })
  assert.equal(p.ext, 'png')
  assert.equal(p.quality, undefined)

  const w = inferOutput({ type: 'image/webp' })
  assert.equal(w.ext, 'webp')
  assert.equal(w.quality, undefined)
})
