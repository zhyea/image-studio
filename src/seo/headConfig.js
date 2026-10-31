/**
 * 声明式 document head 配置（供 @unhead/vue 的 useHead 使用）。
 *
 * 取代旧版 seo/updateHead.js 的「客户端 document.head 动态注入」——
 * 旧版只在浏览器 JS 运行时写 <head>，SSG 预渲染的 HTML 是空壳，不利于 SEO。
 * 现在改为返回 unhead head 对象，由 vite-ssg 在构建期写入每个静态 HTML 的 <head>。
 *
 * 用法（App.vue 内，响应式）：
 *   useHead(() => buildHeadConfig(route, i18n))
 * 其中 i18n 为 createI18n 生成的全局实例（组合式模式 legacy:false）；翻译函数位于
 * i18n.global.t，函数体内访问 i18n.global.locale.value 与 route.path 会建立响应式依赖，
 * 路由/语种变化时 head 自动更新。
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, localeMeta } from '../i18n/localeConfig.js'
import { siteOrigin } from '../config/site.js'
import { canonicalPath } from './canonicalPath.js'

/**
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route
 * @param {{ t: (key: string, params?: Record<string, string|number>) => string, locale: { value: string } }} i18n
 *   本路由独立 i18n 实例（src/i18n/index.js 的极简 Composer，经 app.provide 注入），
 *   指向本路由正确语种，故 head 文案与正文一致。
 * @returns {import('@unhead/vue').HeadObject}
 */
export function buildHeadConfig(route, i18n) {
  const t = i18n.t.bind(i18n)
  const pattern = new RegExp(`^\\/(${SUPPORTED_LOCALES.join('|')})(\\/.*)?$`)
  const m = route.path.match(pattern)
  const locale = m ? m[1] : DEFAULT_LOCALE
  // 以路由路径语种为准（确定性，不依赖全局 i18n 单例在 SSG 预渲染期的竞态）。
  // vite-ssg 现为每路由创建独立 i18n 实例（main.js createI18nInstance），可并行预渲染而互不串位。
  const activeLocale = locale
  const meta = localeMeta(activeLocale)

  const page = route.meta?.seoPage || 'home'
  const site = t('seo.siteName')
  const title = t(`seo.titles.${page}`)
  const description = t(`seo.descriptions.${page}`)
  /** 首页与页面 H1 一致，利于结构化数据与可见标题对齐 */
  const pageHeadline = page === 'home' ? t('home.title') : title
  const fullTitle = page === 'home' ? `${site} — ${title}` : `${title} | ${site}`

  const origin = siteOrigin()
  const canonical = `${origin}${canonicalPath(route.path)}`
  /** 规范路径去掉 locale 段后的部分，供 hreflang 复用，保证 9 个语种 alternate 严格指向同一资源 */
  const tailSegments = canonical.slice(origin.length).split('/').slice(2).filter(Boolean)
  const rest = tailSegments.length ? `/${tailSegments.join('/')}` : ''

  const head = {
    title: fullTitle,
    htmlAttrs: { lang: meta.bcp47, dir: meta.dir },
    meta: [
      { name: 'description', content: description },
      {
        name: 'robots',
        content:
          page === 'notFound'
            ? 'noindex, follow'
            : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      },
      { name: 'format-detection', content: 'telephone=no' },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: site },
      { property: 'og:locale', content: meta.og },
      { property: 'og:url', content: canonical },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
    ],
    link: [{ rel: 'canonical', href: canonical }],
    script: [],
  }
  for (const code of SUPPORTED_LOCALES.filter((c) => c !== activeLocale)) {
    head.meta.push({ property: 'og:locale:alternate', content: localeMeta(code).og })
  }
  for (const code of SUPPORTED_LOCALES) {
    head.link.push({ rel: 'alternate', hreflang: localeMeta(code).hreflang, href: `${origin}/${code}${rest}` })
  }
  head.link.push({ rel: 'alternate', hreflang: 'x-default', href: `${origin}/en${rest}` })

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
          item: `${origin}/${activeLocale}`,
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

  head.script.push({
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': graph,
    }),
  })

  return head
}
