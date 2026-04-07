import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOOLS } from '../src/config/tools.js'
import { SUPPORTED_LOCALES } from '../src/i18n/localeConfig.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outPath = join(root, 'public', 'sitemap.xml')

const origin = (process.env.SITE_ORIGIN || 'https://example.com').replace(/\/$/, '')

const segments = ['', ...TOOLS.map((t) => t.slug)]

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const lastmod = new Date().toISOString().slice(0, 10)

const urls = []
for (const locale of SUPPORTED_LOCALES) {
  for (const seg of segments) {
    const path = seg ? `/${locale}/${seg}` : `/${locale}`
    const loc = `${origin}${path}`
    const priority = seg === '' ? '1.0' : '0.8'
    urls.push(`  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`)
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, xml, 'utf8')
console.log(`Wrote ${urls.length} URLs to public/sitemap.xml (origin=${origin})`)
