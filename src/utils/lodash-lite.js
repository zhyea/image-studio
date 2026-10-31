/**
 * lodash-unified 的精简替代（24 个函数，全部自实现，零依赖）。
 *
 * 背景：Element Plus 从 `lodash-unified`（其内容仅 `export * from 'lodash-es'`）导入
 * clamp / get / set / memoize 等 20+ 个工具函数。其中 `memoize` 依赖 lodash 的 MapCache
 * → Hash/ListCache/MapCache 一整套内部实现，tree-shaking 后仍残留 ~60KB（未压缩），
 * 并被 rollup 提升为跨页共享 chunk，令每个工具页首屏都要承担。
 *
 * 实测产物中 EP 真正用到的只有 get/set/has/trim/toNumber 等少数几个，而 EP 源码层面
 * 引用的全集见下方导出（共 24 个）。本模块用等价的原生实现替换，行为对齐 EP 的使用
 * 场景（简单对象/数组），从而让 EP 组件可以保留、而 lodash 不再进入产物。
 *
 * @see vite.config.js 的 resolve.alias: 'lodash-unified' → 本文件
 */

/* ---------- 类型判断 ---------- */

export function isNull(value) {
  return value === null
}

export function isUndefined(value) {
  return value === undefined
}

export function isNil(value) {
  return value === null || value === undefined
}

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function isEqual(a, b) {
  if (a === b) return true
  // NaN 视为相等（与 Object.is / lodash 的 SameValueZero 一致）
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b)
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (a instanceof RegExp && b instanceof RegExp) return String(a) === String(b)
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => kb.includes(k) && isEqual(a[k], b[k]))
}

/* ---------- 路径访问（get / set / has）---------- */

function toPath(path) {
  if (Array.isArray(path)) return path
  if (typeof path !== 'string') return [path]
  // 支持 'a.b.c' 与 'a[0].b' 两种写法，统一拆成 ['a','0','b']
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((k) => k !== '')
}

export function get(object, path, defaultValue) {
  const keys = toPath(path)
  let cur = object
  for (const key of keys) {
    if (cur == null) return defaultValue
    cur = cur[key]
  }
  return cur === undefined ? defaultValue : cur
}

export function set(object, path, value) {
  if (object == null) return object
  const keys = toPath(path)
  let cur = object
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i]
    if (cur[key] == null) {
      // 下一级是纯数字下标则建数组，否则建对象
      cur[key] = /^\d+$/.test(String(keys[i + 1])) ? [] : {}
    }
    cur = cur[key]
  }
  cur[keys[keys.length - 1]] = value
  return object
}

export function has(object, path) {
  const keys = toPath(path)
  let cur = object
  for (const key of keys) {
    if (cur == null || !Object.prototype.hasOwnProperty.call(Object(cur), key)) return false
    cur = cur[key]
  }
  return true
}

/* ---------- 数值 / 字符串 ---------- */

export function clamp(number, lower, upper) {
  if (upper === undefined) {
    // lodash clamp(number, upper) 语义：下界默认 0
    return Math.min(Math.max(number, 0), lower)
  }
  return Math.min(Math.max(number, lower), upper)
}

export function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value == null) return 0
  const n = parseFloat(String(value).trim())
  return Number.isNaN(n) ? Number(value) : n
}

export function trim(value, chars) {
  const s = String(value)
  if (!chars) return s.trim()
  // 支持 lodash trim(string, chars) 的字符集裁剪
  const escape = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const set = [...chars].map(escape).join('')
  return s.replace(new RegExp(`^[${set}]+|[${set}]+$`, 'g'), '')
}

/* ---------- 数组 ---------- */

export function castArray(value) {
  return Array.isArray(value) ? value : [value]
}

export function flatten(array) {
  if (!Array.isArray(array)) return []
  return array.reduce((acc, item) => acc.concat(item), [])
}

export function flattenDeep(array) {
  if (!Array.isArray(array)) return []
  return array.reduce(
    (acc, item) => acc.concat(Array.isArray(item) ? flattenDeep(item) : item),
    [],
  )
}

export function flatMap(collection, iteratee) {
  const arr = Array.isArray(collection) ? collection : Object.values(collection || {})
  return arr.map(iteratee).reduce((acc, item) => acc.concat(item), [])
}

export function union(...arrays) {
  const out = []
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue
    for (const item of arr) if (!out.includes(item)) out.push(item)
  }
  return out
}

export function fromPairs(pairs) {
  const out = {}
  for (const pair of pairs || []) {
    if (pair && pair.length) out[pair[0]] = pair[1]
  }
  return out
}

export function findLastIndex(array, predicate, fromIndex) {
  if (!Array.isArray(array)) return -1
  const start = fromIndex === undefined ? array.length - 1 : Math.min(fromIndex, array.length - 1)
  for (let i = start; i >= 0; i -= 1) {
    if (predicate(array[i], i, array)) return i
  }
  return -1
}

/* ---------- 对象 ---------- */

export function pick(object, paths) {
  const keys = toPath(paths)
  const out = {}
  for (const key of keys) {
    if (object && key in Object(object)) out[key] = object[key]
  }
  return out
}

export function omit(object, paths) {
  const keys = toPath(paths)
  const out = {}
  for (const key of Object.keys(object || {})) {
    if (!keys.includes(key)) out[key] = object[key]
  }
  return out
}

export function merge(target, ...sources) {
  for (const source of sources) {
    if (!isPlainObject(source) && !Array.isArray(source)) continue
    for (const key of Object.keys(source)) {
      const value = source[key]
      if (value === undefined) continue
      if (isPlainObject(value)) {
        if (!isPlainObject(target[key])) target[key] = {}
        merge(target[key], value)
      } else if (Array.isArray(value)) {
        if (!Array.isArray(target[key])) target[key] = []
        merge(target[key], value)
      } else {
        target[key] = value
      }
    }
  }
  return target
}

export function cloneDeep(value) {
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return new Date(value.getTime())
  if (value instanceof RegExp) return new RegExp(value.source, value.flags)
  if (value instanceof Map) {
    const m = new Map()
    value.forEach((v, k) => m.set(cloneDeep(k), cloneDeep(v)))
    return m
  }
  if (value instanceof Set) {
    const s = new Set()
    value.forEach((v) => s.add(cloneDeep(v)))
    return s
  }
  if (Array.isArray(value)) return value.map(cloneDeep)
  if (isPlainObject(value)) {
    const out = {}
    for (const key of Object.keys(value)) out[key] = cloneDeep(value[key])
    return out
  }
  // 非 PlainObject（如 Vue 响应式对象、类实例）：EP 场景中直接返回原引用
  return value
}

/* ---------- 记忆化（lodash MapCache 的替代，是本次精简的关键）---------- */

export function memoize(func, resolver) {
  const cache = new Map()
  function memoized(...args) {
    const key = resolver ? resolver.apply(this, args) : args[0]
    if (cache.has(key)) return cache.get(key)
    const result = func.apply(this, args)
    cache.set(key, result)
    return result
  }
  memoized.cache = cache
  return memoized
}

/* ---------- 防抖 / 节流 ---------- */

export function debounce(func, wait = 0, options = {}) {
  let timer = null
  let lastArgs = null
  let lastThis = null
  let result
  const leading = options.leading === true
  const trailing = options.trailing !== false

  function invoke() {
    const args = lastArgs
    const thisArg = lastThis
    lastArgs = null
    lastThis = null
    result = func.apply(thisArg, args)
    return result
  }

  function onTimeout() {
    timer = null
    if (trailing && lastArgs) invoke()
  }

  function debounced(...args) {
    lastArgs = args
    lastThis = this
    if (timer === null && leading) invoke()
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(onTimeout, wait)
    return result
  }

  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    lastArgs = null
    lastThis = null
  }
  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer)
      onTimeout()
    }
    return result
  }
  return debounced
}

/**
 * 独立实现节流（不可基于 debounce 退化实现，否则持续触发时会一直不执行，
 * 与 lodash 语义不符）。EP 用于滑块拖动等高频场景。
 */
export function throttle(func, wait = 0, options = {}) {
  const leading = options.leading !== false
  const trailing = options.trailing !== false
  let timer = null
  let lastArgs = null
  let lastThis = null
  let lastRan = 0
  let invokedOnce = false
  let result

  function invoke() {
    lastRan = Date.now()
    invokedOnce = true
    const args = lastArgs
    const thisArg = lastThis
    lastArgs = null
    lastThis = null
    result = func.apply(thisArg, args)
    return result
  }

  function onTimeout() {
    timer = null
    if (trailing && lastArgs) invoke()
  }

  function throttled(...args) {
    lastArgs = args
    lastThis = this
    const now = Date.now()
    const remaining = wait - (now - lastRan)
    const shouldCallNow = remaining <= 0 && (!invokedOnce || leading)
    if (shouldCallNow) {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      invoke()
    } else if (timer === null && trailing) {
      timer = setTimeout(onTimeout, remaining)
    } else if (timer === null && !trailing && !invokedOnce && leading) {
      // leading 且不允许 trailing：首次仍需立刻执行一次
      invoke()
    }
    return result
  }

  throttled.cancel = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    lastArgs = null
    lastThis = null
  }
  throttled.flush = () => {
    if (timer !== null) {
      clearTimeout(timer)
      onTimeout()
    }
    return result
  }
  return throttled
}
