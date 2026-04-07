/**
 * 从实时 DOM 生成骨架屏 HTML（固定定位 + 视口百分比）。
 * 颗粒度 0–100：越小越粗（整行/空白分块），越大越细（Intl 词/字素）。
 * 改编自 skeleton-generator 扩展核心逻辑，支持传入 iframe 的 document。
 */

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'LINK',
  'META',
  'TITLE',
  'HEAD',
  'BR',
  'WBR',
  'TEMPLATE',
])

const DRAW_LEAF_TAGS = new Set(['IMG', 'VIDEO', 'CANVAS', 'INPUT', 'TEXTAREA', 'SELECT'])

function backgroundImageHasUrl(el) {
  const bg = getComputedStyle(el).backgroundImage
  return Boolean(bg && bg !== 'none' && !/^linear-gradient/i.test(bg) && !/^radial-gradient/i.test(bg))
}

function isHidden(el) {
  const st = getComputedStyle(el)
  if (st.display === 'none' || st.visibility === 'hidden') return true
  if (parseFloat(st.opacity) === 0) return true
  if (el.getAttribute('hidden') !== null) return true
  return false
}

function rectVisibleInViewport(rect, vw, vh) {
  return rect.bottom > 0 && rect.right > 0 && rect.top < vh && rect.left < vw
}

function skipPositionedOffscreenSubtree(el, root, vw, vh) {
  if (el === root) return false
  const st = getComputedStyle(el)
  if (st.display === 'contents') return false
  if (st.position !== 'fixed') return false
  const r = el.getBoundingClientRect()
  return !rectVisibleInViewport(r, vw, vh)
}

/**
 * @param {object} options
 * @param {Document} [options.document] 要分析的文档（如同源 iframe 的 contentDocument）；默认当前 document
 * @param {string} [options.background='#eee']
 * @param {number} [options.granularity=100] 0 最粗，100 最细
 * @param {string} [options.rootSelector='body']
 * @returns {string}
 */
export function generateSkeletonHtml(options = {}) {
  const doc =
    options.document ||
    (typeof document !== 'undefined' ? document : null)
  if (!doc || !doc.body) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>'
  }

  const win = doc.defaultView || (typeof window !== 'undefined' ? window : null)
  const background = options.background || '#eee'
  const rootSelector = options.rootSelector || 'body'
  const rawG = options.granularity
  const g = Math.min(
    100,
    Math.max(0, typeof rawG === 'number' && !Number.isNaN(rawG) ? rawG : 100),
  )

  const lang =
    doc.documentElement?.lang?.trim() ||
    win?.navigator?.language ||
    ''

  const lineOnlyText = g < 14
  const useIntlSegmenter = g >= 28
  const useGraphemeSplit = g >= 55
  const maxWordRun = Math.round(36 + (100 - g) * 2.65)
  const minDim = Math.max(0.45, 1.95 - (g / 100) * 1.5)

  const root = doc.querySelector(rootSelector) || doc.body
  const vv = win?.visualViewport ?? null
  const de = doc.documentElement
  const vw = Math.max(
    vv?.width ?? 0,
    win?.innerWidth || 0,
    de?.clientWidth ?? 0,
    1,
  )
  const vh = Math.max(
    vv?.height ?? 0,
    win?.innerHeight || 0,
    de?.clientHeight ?? 0,
    1,
  )
  const blocks = []
  let z = 1000
  const seenRectKeys = new Set()

  function pctX(n) {
    return (n / vw) * 100
  }
  function pctY(n) {
    return (n / vh) * 100
  }

  function rectDedupKey(rect) {
    return [
      Math.round(rect.top * 10),
      Math.round(rect.left * 10),
      Math.round(rect.width * 10),
      Math.round(rect.height * 10),
    ].join(',')
  }

  function pushRect(styleEl, rect, lineStrip) {
    if (!rect || rect.width < minDim || rect.height < minDim) return
    if (!rectVisibleInViewport(rect, vw, vh)) return
    const key = rectDedupKey(rect)
    if (seenRectKeys.has(key)) return
    seenRectKeys.add(key)

    const st = getComputedStyle(styleEl)
    let radius = st.borderRadius
    if (lineStrip && rect.height > 0) {
      const cap = Math.min(rect.height * 0.45, 6)
      radius = `${cap}px`
    }
    const parts = [
      'position:fixed',
      `z-index:${z++}`,
      `top:${pctY(rect.top)}%`,
      `left:${pctX(rect.left)}%`,
      `width:${pctX(rect.width)}%`,
      `height:${pctY(rect.height)}%`,
      `background:${background}`,
      'pointer-events:none',
      'box-sizing:border-box',
    ]
    if (radius && radius !== '0px') {
      parts.push(`border-radius:${radius}`)
    }
    blocks.push(`<div style="${parts.join(';')}"></div>`)
  }

  function whitespaceSplitSegments(text, maxRun) {
    const out = []
    let i = 0
    while (i < text.length) {
      while (i < text.length && /\s/.test(text[i])) i++
      if (i >= text.length) break
      let j = i
      while (j < text.length && !/\s/.test(text[j])) j++
      const run = j - i
      if (run > maxRun) {
        for (let k = i; k < j; k++) {
          const ch = text[k]
          if (/\S/.test(ch)) out.push([k, k + 1])
        }
      } else {
        out.push([i, j])
      }
      i = j
    }
    return out
  }

  function getTextSegments(text) {
    if (lineOnlyText) {
      return []
    }

    const locale = lang && lang.trim() ? lang : 'und'
    const out = []

    if (useIntlSegmenter && typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const words = new Intl.Segmenter(locale, { granularity: 'word' })
        for (const { segment, index } of words.segment(text)) {
          if (!/\S/.test(segment)) continue
          if (segment.length > maxWordRun) {
            if (useGraphemeSplit) {
              const graphs = new Intl.Segmenter(locale, { granularity: 'grapheme' })
              for (const { segment: gr, index: gi } of graphs.segment(segment)) {
                if (!/\S/.test(gr)) continue
                const a = index + gi
                out.push([a, a + gr.length])
              }
            } else {
              out.push([index, index + segment.length])
            }
          } else {
            out.push([index, index + segment.length])
          }
        }
        if (out.length) return out
      } catch {
        /* fall through */
      }
    }

    return whitespaceSplitSegments(text, maxWordRun)
  }

  function pushFineRectsForTextNode(textNode) {
    const parent = textNode.parentElement
    if (!parent || isHidden(parent)) return
    const t = textNode.textContent
    if (!t || !t.trim()) return

    const segments = getTextSegments(t)
    const range = doc.createRange()

    if (segments.length === 0) {
      range.setStart(textNode, 0)
      range.setEnd(textNode, textNode.length)
      addRectsFromRange(parent, range)
      return
    }

    for (let s = 0; s < segments.length; s++) {
      const [a, b] = segments[s]
      if (a >= b || b > textNode.length) continue
      range.setStart(textNode, a)
      range.setEnd(textNode, b)
      addRectsFromRange(parent, range)
    }
  }

  function addRectsFromRange(parent, range) {
    let rects
    try {
      rects = range.getClientRects()
    } catch {
      return
    }
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      if (r.width < minDim || r.height < minDim) continue
      pushRect(parent, r, true)
    }
  }

  function shouldIgnore(el) {
    if (!el || el.nodeType !== 1) return true
    const tag = el.tagName
    if (SKIP_TAGS.has(tag)) return true
    if (isHidden(el)) return true
    const st = getComputedStyle(el)
    if (st.display === 'contents') {
      return false
    }
    const rect = el.getBoundingClientRect()
    if (rect.width < minDim || rect.height < minDim) {
      if (el.childNodes.length > 0 || el.shadowRoot) {
        return false
      }
      return true
    }
    return false
  }

  function walkEmbeddedDocument(el) {
    try {
      const embedded = el.contentDocument
      if (embedded?.body) {
        walk(embedded.body)
        return true
      }
    } catch {
      /* cross-origin */
    }
    return false
  }

  function walk(el) {
    if (shouldIgnore(el)) return
    if (skipPositionedOffscreenSubtree(el, root, vw, vh)) return

    const tag = el.tagName

    if (tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') {
      if (!walkEmbeddedDocument(el)) {
        pushRect(el, el.getBoundingClientRect(), false)
      }
      return
    }

    if (tag === 'SVG') {
      const nodes = el.childNodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        if (n.nodeType === Node.TEXT_NODE) {
          pushFineRectsForTextNode(n)
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          walk(n)
        }
      }
      return
    }

    if (DRAW_LEAF_TAGS.has(tag)) {
      pushRect(el, el.getBoundingClientRect(), false)
      return
    }

    if (backgroundImageHasUrl(el)) {
      pushRect(el, el.getBoundingClientRect(), false)
    }

    const nodes = el.childNodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      if (n.nodeType === Node.TEXT_NODE) {
        pushFineRectsForTextNode(n)
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        walk(n)
      }
    }

    const sr = el.shadowRoot
    if (sr) {
      const kids = sr.children
      for (let j = 0; j < kids.length; j++) {
        walk(kids[j])
      }
    }

    if (el.childNodes.length === 0 && tag !== 'BODY' && tag !== 'HTML') {
      const rect = el.getBoundingClientRect()
      if (rect.width >= minDim && rect.height >= minDim) {
        pushRect(el, rect, false)
      }
    }
  }

  walk(root)

  const extraHead =
    '<meta charset="utf-8"><style>html,body{margin:0;min-height:100vh;height:100%;background:#fff}</style>'

  return `<!DOCTYPE html><html><head>${extraHead}</head><body>${blocks.join('')}</body></html>`
}

/**
 * 将用户粘贴的 HTML 片段包成完整文档，便于写入 iframe srcdoc。
 * @param {string} fragment
 */
export function wrapHtmlFragment(fragment) {
  const safe = fragment?.trim() ? fragment : '<p></p>'
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;min-height:100%}</style></head><body>${safe}</body></html>`
}
