import test from 'node:test'
import assert from 'node:assert/strict'
import { fileBaseName } from '../src/utils/image.js'

test('strips a single extension', () => {
  assert.equal(fileBaseName({ name: 'photo.jpg' }), 'photo')
})

test('keeps middle dots, strips only the last extension', () => {
  assert.equal(fileBaseName({ name: 'a.b.c.png' }), 'a.b.c')
})

test('no extension returns the name as-is', () => {
  assert.equal(fileBaseName({ name: 'screenshot' }), 'screenshot')
})

test('empty name falls back to "image"', () => {
  assert.equal(fileBaseName({ name: '' }), 'image')
})
