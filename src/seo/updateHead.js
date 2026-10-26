/**
 * 客户端 SEO：与多语言路由联动。SPA 需爬虫执行 JS 才能完整抓取；
 * 生产环境可配合 SSR/预渲染或 sitemap 提升收录（参见 Google Search Central）。
 * hreflang / canonical 参考：https://support.google.com/webmasters/answer/189077
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, localeMeta } from '../i18n/localeConfig.js'
import { siteOrigin } from '../config/site.js'
import { canonicalPath } from './canonicalPath.js'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function removeMetaByProperty(property) {
  document.querySelectorAll(`meta[property="${property}"]`).forEach((n) => n.remove())
}

function setMetaPropertyMulti(property, contents) {
  removeMetaByProperty(property)
  for (const content of contents) {
    const el = document.createElement('meta')
    el.setAttribute('property', property)
    el.setAttribute('content', content)
    document.head.appendChild(el)
  }
}

function upsertLink(rel, href, hreflang = null) {
  const sel = hreflang != null ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`
  let el = document.head.querySelector(sel)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    if (hreflang != null) el.setAttribute('hreflang', hreflang)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function removeJsonLd() {
  document.querySelectorAll('script[data-seo-jsonld]').forEach((n) => n.remove())
}

/**
 * @param {import('vue-router').RouteLocationNormalizedLoaded} to
 * @param {import('vue-i18n').Composer} i18n
 */
export function applyRouteSeo(to, i18n) {
  const t = i18n.t.bind(i18n)
  const pattern = new RegExp(`^\\/(${SUPPORTED_LOCALES.join('|')})(\\/.*)?$`)
  const m = to.path.match(pattern)
  const locale = m ? m[1] : DEFAULT_LOCALE
  const meta = localeMeta(locale)

  const page = to.meta.seoPage || 'home'
  const site = t('seo.siteName')
  const title = t(`seo.titles.${page}`)
  const description = t(`seo.descriptions.${page}`)
  /** 首页与页面 H1 一致，利于结构化数据与可见标题对齐 */
  const pageHeadline = page === 'home' ? t('home.title') : title
  const fullTitle = page === 'home' ? `${site} — ${title}` : `${title} | ${site}`

  document.title = fullTitle
  document.documentElement.lang = meta.bcp47
  document.documentElement.dir = meta.dir

  upsertMeta('name', 'description', description)
  if (page === 'notFound') {
    upsertMeta('name', 'robots', 'noindex, follow')
  } else {
    upsertMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
  }
  upsertMeta('name', 'format-detection', 'telephone=no')

  upsertMeta('property', 'og:title', fullTitle)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:site_name', site)
  upsertMeta('property', 'og:locale', meta.og)
  const alternatesOg = SUPPORTED_LOCALES.filter((c) => c !== locale).map((c) => localeMeta(c).og)
  setMetaPropertyMulti('og:locale:alternate', alternatesOg)

  upsertMeta('name', 'twitter:card', 'summary')
  upsertMeta('name', 'twitter:title', fullTitle)
  upsertMeta('name', 'twitter:description', description)

  const origin = siteOrigin()
  const canonical = `${origin}${canonicalPath(to.path)}`
  /** 规范路径去掉 locale 段后的部分，供 hreflang 复用，保证 9 个语种 alternate 严格指向同一资源 */
  const tailSegments = canonical.slice(origin.length).split('/').slice(2).filter(Boolean)
  const rest = tailSegments.length ? `/${tailSegments.join('/')}` : ''
  upsertMeta('property', 'og:url', canonical)

  upsertLink('canonical', canonical)
  for (const code of SUPPORTED_LOCALES) {
    upsertLink('alternate', `${origin}/${code}${rest}`, localeMeta(code).hreflang)
  }
  upsertLink('alternate', `${origin}/en${rest}`, 'x-default')

  const homeDesc = t('seo.descriptions.home')
  const allBcp47 = [...new Set(SUPPORTED_LOCALES.map((c) => localeMeta(c).bcp47))]
  const webPageNode = {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: fullTitle,
    headline: pageHeadline,
    description,
    inLanguage: meta.bcp47,
    isPartOf: { '@id': `${origin}/#website` },
  }
  if (page !== 'notFound') {
    webPageNode.mainEntity = { '@id': `${canonical}#software` }
  }

  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: site,
      url: `${origin}/`,
      description: homeDesc,
      inLanguage: allBcp47,
      publisher: {
        '@type': 'Organization',
        name: site,
        url: `${origin}/`,
      },
    },
    webPageNode,
  ]

  if (page === 'notFound') {
    // 仅保留 WebSite + WebPage，避免为无效 URL 生成工具类结构化数据
  } else if (page === 'home') {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${canonical}#software`,
      name: site,
      description: homeDesc,
      url: canonical,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      browserRequirements: 'Requires JavaScript. Processing is local-only.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      mainEntityOfPage: { '@id': `${canonical}#webpage` },
    })
  } else {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: t('nav.home'),
          item: `${origin}/${locale}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: title,
          item: canonical,
        },
      ],
    })
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${canonical}#software`,
      name: `${title} — ${site}`,
      description,
      url: canonical,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web Browser',
      browserRequirements: 'Requires JavaScript. Processing is local-only.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      mainEntityOfPage: { '@id': `${canonical}#webpage` },
    })
  }

  removeJsonLd()
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.setAttribute('data-seo-jsonld', '1')
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  })
  document.head.appendChild(script)
}
