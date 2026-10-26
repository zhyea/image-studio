import test from 'node:test'
import assert from 'node:assert/strict'
import { applyColorKey, applyColorKeyAsync } from '../src/utils/colorKey.js'

function cloneImageData(img) {
  return { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height }
}

function makeImageData(w, h, fill = [255, 255, 255, 255]) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]
    data[i + 1] = fill[1]
    data[i + 2] = fill[2]
    data[i + 3] = fill[3]
  }
  return { data, width: w, height: h }
}

test('exact key color becomes fully transparent', () => {
  const img = makeImageData(2, 1, [255, 255, 255, 255])
  applyColorKey(img, [255, 255, 255], 48, 0)
  assert.equal(img.data[3], 0)
})

test('far color stays fully opaque', () => {
  const img = makeImageData(2, 1, [0, 0, 0, 255])
  applyColorKey(img, [255, 255, 255], 48, 0)
  assert.equal(img.data[3], 255)
})

test('distance is Euclidean over RGB', () => {
  // [200,200,200] vs [255,255,255] => sqrt(55^2 * 3) ≈ 95.26
  const img = makeImageData(1, 1, [200, 200, 200, 255])
  applyColorKey(img, [255, 255,255], 48, 0)
  // d=95.26 > tolerance(48) and > tolerance+feather(48) => opaque
  assert.equal(img.data[3], 255)
})

test('feather blends alpha within transition band', () => {
  // d≈95.26, tolerance=48, feather=50 => t=(95.26-48)/50 ≈ 0.945 => alpha≈241
  const img = makeImageData(1, 1, [200, 200, 200, 255])
  applyColorKey(img, [255, 255, 255], 48, 50)
  const expected = Math.round(255 * Math.min(1, Math.max(0, (95.26 - 48) / 50)))
  assert.equal(img.data[3], expected)
  assert.ok(img.data[3] > 0 && img.data[3] < 255, 'alpha is partially transparent')
})

test('feather band upper bound keeps opaque', () => {
  const img = makeImageData(1, 1, [0, 0, 0, 255])
  applyColorKey(img, [255, 255, 255], 48, 50)
  assert.equal(img.data[3], 255)
})

test('tolerance zero keeps near-exact pixels', () => {
  const img = makeImageData(1, 1, [254, 255, 255, 255])
  applyColorKey(img, [255, 255, 255], 0, 0)
  // distance = 1 > tolerance 0 => opaque
  assert.equal(img.data[3], 255)
})

test('processes every pixel', () => {
  // 最大 RGB 欧氏距离 ≈ 441.67；tolerance=500 必使所有像素落入透明带，
  // 从而验证循环确实遍历并处理了每一个像素（无遗漏 / 无越界）。
  const img = makeImageData(3, 2, [10, 20, 30, 255])
  applyColorKey(img, [255, 255, 255], 500, 0)
  for (let i = 3; i < img.data.length; i += 4) {
    assert.equal(img.data[i], 0)
  }
})

test('async result is pixel-identical to sync', async () => {
  // 注入同步 resolve 的 yieldFn，验证分块不产生任何差异。
  const sync = makeImageData(7, 5, [200, 100, 50, 255])
  const asyncImg = cloneImageData(sync)

  applyColorKey(sync, [255, 255, 255], 48, 30)
  const yieldSpy = { count: 0 }
  await applyColorKeyAsync(asyncImg, [255, 255, 255], 48, 30, {
    chunkPixels: 4,
    yieldFn: async () => {
      yieldSpy.count++
    },
  })

  assert.deepEqual(Array.from(asyncImg.data), Array.from(sync.data))
  assert.ok(yieldSpy.count > 0, 'yieldFn called between chunks')
})

test('async yields even on a single large buffer', async () => {
  const img = makeImageData(200, 200, [10, 20, 30, 255])
  const yields = []
  await applyColorKeyAsync(img, [255, 255, 255], 500, 0, {
    chunkPixels: 1000,
    yieldFn: async () => {
      yields.push(1)
    },
  })
  // 40000 像素 / 1000 = 40 块 → 块间让出约 39 次；全透明。
  assert.ok(yields.length >= 30, 'yielded between many chunks')
  for (let i = 3; i < img.data.length; i += 4) {
    assert.equal(img.data[i], 0)
  }
})
