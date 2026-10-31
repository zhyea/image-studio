import fs from 'fs'
import path from 'path'

const dir = 'src/views'
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.vue'))
const re = /<el-slider\b[\s\S]*?\/>/g

let total = 0
let skip = 0

for (const f of files) {
  const p = path.join(dir, f)
  const s = fs.readFileSync(p, 'utf8')
  const s2 = s.replace(re, (block) => {
    const body = block.replace(/^<el-slider\s*/, '').replace(/\s*\/>$/, '')
    const get = (re2) => (body.match(re2) || [])[1]
    const vm = get(/v-model="([^"]+)"/)
    const min = get(/:min="([^"]+)"/)
    const max = get(/:max="([^"]+)"/)
    const step = get(/:step="([^"]+)"/)
    const dis = get(/:disabled="([^"]+)"/)
    const cls = get(/class="([^"]+)"/)
    const inp = get(/@input="([^"]+)"/)
    if (!vm || !min || !max || !dis) {
      skip++
      console.log('SKIP', f, '-> missing attr in:', block.slice(0, 70).replace(/\n/g, ' '))
      return block
    }
    const stepAttr = step ? ` step="${step}"` : ''
    const clsAttr = cls ? ' ' + cls : ''
    const inpAttr = inp ? ` @input="${inp}"` : ''
    total++
    return (
      `<div class="u-slider${clsAttr}">\n` +
      `  <input type="range" v-model.number="${vm}" min="${min}" max="${max}"${stepAttr} class="u-slider__range" :disabled="${dis}"${inpAttr} />\n` +
      `  <input type="number" v-model.number="${vm}" min="${min}" max="${max}"${stepAttr} class="u-slider__num" :disabled="${dis}" />\n` +
      `</div>`
    )
  })
  if (s2 !== s) fs.writeFileSync(p, s2)
}

console.log(`converted=${total} skip=${skip}`)
