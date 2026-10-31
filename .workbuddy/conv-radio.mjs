import fs from 'fs'
import path from 'path'

const dir = 'src/views'
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.vue'))
const groupRe = /<el-radio-group\b[\s\S]*?<\/el-radio-group>/g

let total = 0
let skip = 0

for (const f of files) {
  const p = path.join(dir, f)
  const s = fs.readFileSync(p, 'utf8')
  const s2 = s.replace(groupRe, (m) => {
    const open = m.match(/<el-radio-group\b([\s\S]*?)>/)
    const openAttrs = open ? open[1] : ''
    const vm = (openAttrs.match(/v-model="([^"]+)"/) || [])[1]
    const dis = (openAttrs.match(/:disabled="([^"]+)"/) || [])[1]
    if (!vm) {
      skip++
      console.log('SKIP (no v-model)', f)
      return m
    }
    const inner = m.replace(/^<el-radio-group\b[\s\S]*?>/, '').replace(/<\/el-radio-group>$/, '')
    const rbs = [...inner.matchAll(/<el-radio-button\b([^>]*)>([\s\S]*?)<\/el-radio-button>/g)]
    if (rbs.length === 0) {
      skip++
      console.log('SKIP (no buttons)', f)
      return m
    }
    const items = rbs
      .map((rb) => {
        const attr = rb[1]
        const content = rb[2].trim()
        const val = (attr.match(/value="([^"]+)"/) || [])[1]
        if (val === undefined) return null
        const isNum = /^\d+$/.test(val)
        const valExpr = isNum ? val : `'${val}'`
        const disAttr = dis ? ` :disabled="${dis}"` : ''
        return (
          `    <label class="u-seg__item" :class="{ 'is-active': ${vm} === ${valExpr} }">\n` +
          `      <input type="radio" class="u-seg__input" value="${val}" v-model.number="${vm}"${disAttr} /> ${content}\n` +
          `    </label>`
        )
      })
      .filter(Boolean)
    if (items.length === 0) {
      skip++
      console.log('SKIP (parse fail)', f)
      return m
    }
    total++
    return (
      `<div class="u-seg" role="radiogroup" aria-label="${vm}">\n` +
      items.join('\n') +
      `\n  </div>`
    )
  })
  if (s2 !== s) fs.writeFileSync(p, s2)
}

console.log(`converted=${total} skip=${skip}`)
