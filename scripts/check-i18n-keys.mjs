/**
 * 校验 9 个 locales/*.json 的 key 集合完全一致。
 * 零依赖（仅 Node 内置 fs/path/url），可在 CI 或本地 `npm run check:i18n` 运行。
 * 任一语言缺失 / 多出 key 即非零退出，防止静默回退造成页面混语言。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesDir = join(__dirname, '..', 'src', 'i18n', 'locales')

function flatten(obj, prefix = '') {
  const keys = new Set()
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flatten(v, path)) keys.add(sub)
    } else {
      keys.add(path)
    }
  }
  return keys
}

const files = readdirSync(localesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()

if (files.length === 0) {
  console.error(`[check-i18n] No locale files found in ${localesDir}`)
  process.exit(1)
}

const byCode = {}
for (const f of files) {
  const code = f.replace(/\.json$/, '')
  const json = JSON.parse(readFileSync(join(localesDir, f), 'utf8'))
  byCode[code] = flatten(json)
}

const codes = files.map((f) => f.replace(/\.json$/, ''))
const baselineCode = codes[0]
const baseline = byCode[baselineCode]

let failed = false
for (const code of codes.slice(1)) {
  const missing = [...baseline].filter((k) => !byCode[code].has(k))
  const extra = [...byCode[code]].filter((k) => !baseline.has(k))
  if (missing.length || extra.length) {
    failed = true
    console.error(`\n[check-i18n] ${code} vs ${baselineCode}`)
    if (missing.length) console.error('  missing:', missing.join(', '))
    if (extra.length) console.error('  extra:  ', extra.join(', '))
  }
}

if (failed) {
  console.error('\n[check-i18n] i18n key mismatch detected.')
  process.exit(1)
}

console.log(
  `[check-i18n] OK — ${codes.length} locales, ${baseline.size} keys each, all consistent.`,
)
