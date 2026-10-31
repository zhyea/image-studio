# Image Studio

免费、开源的**在线图片工具箱**，全部处理在**浏览器本地完成，图片不上传服务器**。免安装、支持 9 种语言。

> 隐私优先：你选择的图片只在本机处理，不会被上传到任何服务器。

## 功能

- 压缩（Compress）
- AI 超分放大（Upscale，2x / 4x）
- 抠图 / 去背景（Background Removal，按关键色容差 + 羽化）
- 改尺寸（Resize）
- 裁剪（Crop）
- 转 JPG（Convert to JPG）
- 旋转（Rotate，自由角度 / 90° 预设）
- 水印（Watermark，可选字体、字号、透明度、颜色）
- 表情包 / 梗图（Meme）
- HTML 转图片（HTML to Image）
- 区域模糊（Blur，隐私打码）
- 网页骨架屏生成（Web Skeleton）

## 技术栈

- Vue 3.5（`<script setup>` SFC）+ Vite 8
- Element Plus 已完全原生化（200+ 处组件 / 图标 / 消息换自研零依赖控件，产物零 EP 依赖）
- vue-router 5、vue-i18n 11（9 语言）
- 图像处理：`@tensorflow/tfjs` + `upscaler`（AI 超分）、`cropperjs`、`pica`（高质量重采样）、`stackblur-canvas`、`html2canvas`
- 部署：Netlify（`netlify.toml` 声明 `publish = "dist"`；`netlify/edge-functions/seo-canonical.js` 负责 canonical / hreflang 注入、URL 规范化与未知路径真 404；`public/_redirects` 提供 SPA 路由回退）

## 性能与体积优化

以「浏览器本地处理、首屏快、页面独立」为目标的持续优化（造物挑战期间完成）：

- **Element Plus 完全原生化**：移除全部 200+ 处 EP 组件 / 图标 / 消息依赖，改用自研零依赖控件
  （`toast`、`Dialog`、内联 `ToolIcon`，以及原生 `input / select / textarea / checkbox / radio / slider / segmented`）。
  `element-plus` 在最终产物中出现 **0 次**；`app.js` 由含 EP 主包的 ~300KB 降至 ~150KB（raw）。
- **自研极简 i18n 取代 vue-i18n**：每路由独立实例 + 语种消息按需 `import()` 拆分，9 语种 **225** key 一致，直接省下约 27KB/页；
  并根除 vite-ssg 并行预渲染的全局单例竞态。
- **重型库按需加载**：`cropperjs`、`html2canvas`、`stackblur-canvas` 改为 `import()` 动态加载，只有用到裁剪 / 生成图 / 模糊时才下载，不挤首屏。
- **vite-ssg 并行预渲染**：9 语种 × 12 工具预渲染 117+ 独立静态页；通过「每路由独立 i18n 实例」根除全局单例竞态，恢复默认并行且零语种串位。

结果：首页初始 JS+CSS 由早期 ~140KB gzip 降至 **53KB**（−62%），全站平均 **60KB**；
`node --test` **64/64**、9 语种 **225** key 一致性校验全绿。

## 本地开发

```bash
npm install      # 完整安装（含 devDependencies，否则 .vue 解析会失败，见 scripts/ensure-deps.mjs）
npm run dev      # 本地开发
npm run build    # 构建（含 ensure-deps 校验 + 生成 public/sitemap.xml）
npm run preview  # 预览构建产物
npm run sitemap  # 仅重新生成 sitemap
```

## 目录结构

```
src/
  views/        各工具页 / 路由页（*View.vue）
  components/    跨页复用组件（ImagePicker、ToolProgressBar）
  composables/   有状态复用逻辑（usePageI18n）
  utils/         纯函数 / 算法（image、colorKey、skeletonGenerator、aiUpscale）
  config/        静态配置（tools.js 工具清单）
  i18n/          国际化（localeConfig + locales/*.json + 实例）
  seo/           客户端 SEO（动态 head / json-LD）
  router/        路由（/:locale 前缀 + 本地化子路由）
scripts/         构建期 Node 脚本（ensure-deps、generate-sitemap）
public/          静态资源（favicon、logo、robots.txt、sitemap.xml）
```

## 开发规范

- 代码规范见 [`CODING_STANDARDS.md`](./CODING_STANDARDS.md)
- 提交前评审清单见 [`REVIEW_CHECKLIST.md`](./REVIEW_CHECKLIST.md)
- 最近一次代码评审结论见 [`CODE_REVIEW_REPORT.md`](./CODE_REVIEW_REPORT.md)

## 部署说明

目标平台 **Netlify**（原 Vercel 配置 `vercel.json` 已移除，避免多平台配置冲突）：

| 文件 | 作用 |
| --- | --- |
| `netlify.toml` | 构建命令 `npm run build`、产物目录 `dist`、挂载 `seo-canonical` 边车到 `/*` |
| `netlify/edge-functions/seo-canonical.js` | canonical / hreflang 注入、URL 规范化、未知路径返回真 404 |
| `public/_redirects` | SPA 路由回退（`/* → /index.html 200`） |

已移除：`vercel.json`、`public/.htaccess`（Apache 配置，Netlify 不需要）。
新增 / 调整部署相关配置时请同步更新本表与 `netlifySeoCanonical.test.mjs`、`canonicalPath.test.mjs` 两个测试。
