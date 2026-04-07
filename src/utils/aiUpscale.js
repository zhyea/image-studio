/**
 * 浏览器端超分（UpscalerJS + TensorFlow.js），按需动态加载。
 * 必须使用 patchSize 分块，否则大图会整图进 GPU，易触发 WebGL 纹理上限与显存告警。
 */
import { dataUrlToBlob } from './image.js'

const PATCH_SIZE = 128
const PATCH_PADDING = 4

function isWebglCapacityError(err) {
  const msg = err && typeof err.message === 'string' ? err.message : String(err)
  return /texture size|WebGL maximum|MAX_TEXTURE|too large|out of memory|GPU/i.test(msg)
}

async function flushTfGpu(tf) {
  try {
    await tf.nextFrame()
  } catch {
    /* ignore */
  }
}

export async function runAiSuperResolution(imageElement, opts = {}) {
  const passes = opts.passes === 2 ? 2 : 1
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {}

  const [{ default: Upscaler }, tf, { default: defaultModel }] = await Promise.all([
    import('upscaler'),
    import('@tensorflow/tfjs'),
    import('@upscalerjs/default-model'),
  ])

  await tf.ready()

  try {
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', false)
  } catch {
    /* ignore */
  }

  const sharedUpscaleArgs = {
    patchSize: PATCH_SIZE,
    padding: PATCH_PADDING,
    awaitNextFrame: true,
  }

  async function runOnBackend(backendName) {
    await tf.setBackend(backendName)
    await tf.ready()
    await flushTfGpu(tf)

    const upscaler = new Upscaler({ model: defaultModel })
    try {
      await upscaler.ready
      onProgress(0.03)

      const upscaleOnce = async (el, passIndex) => {
        return upscaler.upscale(el, {
          ...sharedUpscaleArgs,
          progress: (amount) => {
            if (typeof amount !== 'number') return
            const t = Math.min(1, Math.max(0, amount))
            if (passes === 2) {
              const p = passIndex === 0 ? t * 0.42 : 0.42 + t * 0.53
              onProgress(Math.min(0.98, p))
            } else {
              onProgress(0.03 + t * 0.94)
            }
          },
        })
      }

      let result = await upscaleOnce(imageElement, 0)
      await flushTfGpu(tf)

      if (passes === 2) {
        const mid = new Image()
        mid.crossOrigin = 'anonymous'
        mid.decoding = 'async'
        const blob = dataUrlToBlob(result)
        const midUrl = URL.createObjectURL(blob)
        try {
          await new Promise((resolve, reject) => {
            mid.onload = resolve
            mid.onerror = reject
            mid.src = midUrl
          })
        } finally {
          URL.revokeObjectURL(midUrl)
        }
        await flushTfGpu(tf)
        result = await upscaleOnce(mid, 1)
        mid.removeAttribute('src')
      }

      onProgress(1)
      return result
    } finally {
      await upscaler.dispose()
      await flushTfGpu(tf)
    }
  }

  try {
    return await runOnBackend('webgl')
  } catch (e) {
    if (!isWebglCapacityError(e)) throw e
    console.warn('[aiUpscale] WebGL failed, retrying on CPU (slower)', e)
    return await runOnBackend('cpu')
  }
}
