/**
 * 极轻量全局提示（toast），替代 Element Plus 的 ElMessage。
 *
 * 背景：ElMessage 从 `element-plus` 主包导入，内部依赖 lodash-unified；因被 12 个视图
 * 共用，rollup 将其与工具函数提升为**共享 chunk**（构建产物 i18n-*.js，29KB raw /
 * 11KB gz），导致包括首页在内的每个页面首屏都强制加载。而 toast 属于典型的
 * 「功能依赖」——只在用户操作后才出现，不参与首屏渲染。
 *
 * 本实现零依赖、SSR 安全（无 document 时静默），样式在**首次调用时**才注入
 * <style>，未触发提示的页面首屏不产生任何成本。
 */

const CONTAINER_ID = 'is-toast-root'
const STYLE_ID = 'is-toast-style'
const DEFAULT_DURATION = 2600
/** 语义 → 角标字符（避免引入图标库） */
const MARKS = { success: '✓', warning: '!', error: '×', info: 'i' }

const CSS = `.is-toast-root{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:3000;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
.is-toast{display:inline-flex;align-items:center;gap:8px;max-width:min(90vw,420px);padding:9px 14px;border:1px solid #e4e7ed;border-radius:8px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.12);color:#303133;font-size:14px;line-height:1.45;opacity:0;transform:translateY(-8px);transition:opacity .22s ease,transform .22s ease;pointer-events:auto;cursor:pointer}
.is-toast--in{opacity:1;transform:translateY(0)}
.is-toast__mark{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;color:#fff;font-size:12px;font-weight:700}
.is-toast__text{word-break:break-word}
.is-toast--success .is-toast__mark{background:#67c23a}
.is-toast--warning .is-toast__mark{background:#e6a23c}
.is-toast--error .is-toast__mark{background:#f56c6c}
.is-toast--info .is-toast__mark{background:#909399}`

function ensureStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

function ensureContainer() {
  if (typeof document === 'undefined') return null
  let el = document.getElementById(CONTAINER_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = CONTAINER_ID
    el.className = 'is-toast-root'
    document.body.appendChild(el)
  }
  return el
}

/**
 * @param {'success'|'warning'|'error'|'info'} type
 * @param {string} message
 * @param {number} [duration] 毫秒；传 0 表示不自动消失
 */
function show(type, message, duration = DEFAULT_DURATION) {
  if (!message) return
  ensureStyle()
  const root = ensureContainer()
  if (!root) return

  const item = document.createElement('div')
  item.className = `is-toast is-toast--${type}`
  // 错误用 alert（打断式），其余用 status（礼貌式），便于读屏器正确处理
  item.setAttribute('role', type === 'error' ? 'alert' : 'status')
  item.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite')

  const mark = document.createElement('span')
  mark.className = 'is-toast__mark'
  mark.textContent = MARKS[type] ?? ''
  mark.setAttribute('aria-hidden', 'true')

  const text = document.createElement('span')
  text.className = 'is-toast__text'
  text.textContent = message

  item.append(mark, text)
  root.appendChild(item)

  // 入场：先挂载再下一帧加类，确保 transition 生效
  requestAnimationFrame(() => item.classList.add('is-toast--in'))

  let timer = 0
  const close = () => {
    clearTimeout(timer)
    item.classList.remove('is-toast--in')
    // 退场动画结束后移除；transitionend 可能因页面切到后台不触发，用定时器兜底
    item.addEventListener('transitionend', () => item.remove(), { once: true })
    setTimeout(() => item.remove(), 400)
  }
  if (duration > 0) timer = setTimeout(close, duration)
  // 点击立即关闭
  item.addEventListener('click', close)

  // 同屏堆叠上限，避免连续操作堆积一屏提示
  const MAX = 4
  while (root.children.length > MAX) root.firstElementChild.remove()
}

export const toast = {
  /** @param {string} message @param {number} [duration] */
  success: (message, duration) => show('success', message, duration),
  /** @param {string} message @param {number} [duration] */
  warning: (message, duration) => show('warning', message, duration),
  /** @param {string} message @param {number} [duration] */
  error: (message, duration) => show('error', message, duration),
  /** @param {string} message @param {number} [duration] */
  info: (message, duration) => show('info', message, duration),
}

export default toast
