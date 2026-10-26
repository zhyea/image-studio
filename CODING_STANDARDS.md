# Image Studio 代码规范（CODING STANDARDS）

> 适用范围：本仓库（`image-studio`）全部前端源码。
> 技术基线：Vue 3.5 `<script setup>` + Vite 8 + Element Plus 2.13 + vue-router 5 + vue-i18n 11，**纯 JavaScript（非 TypeScript）**，单页应用，部署于 Netlify。
> 核心理念：图片**全程在浏览器本地处理、不上传服务器**；所有处理类功能必须保证资源及时释放、对超大输入有边界保护、对用户可见错误有统一反馈。

---

## 1. 目录与文件组织

| 目录 | 职责 | 禁止 |
|---|---|---|
| `src/views/*.vue` | 单一工具页 / 路由页（一个文件 = 一个页面） | 放可复用业务逻辑 |
| `src/components/*.vue` | 跨页面复用的展示/交互组件（如 `ImagePicker`、`ToolProgressBar`） | 直接调路由或读写业务状态 |
| `src/composables/*.js` | 跨页面复用的有状态逻辑（如 `usePageI18n`） | 含 DOM 直接操作以外副作用 |
| `src/utils/*.js` | **纯函数 / 无副作用**算法（如 `image`、`colorKey`、`skeletonGenerator`、`aiUpscale`） | 触发副作用（弹窗、路由跳转） |
| `src/config/*.js` | 静态配置（如 `tools.js` 工具清单） | 运行时可变状态 |
| `src/i18n/` | 国际化：`localeConfig.js`（语言元数据）+ `locales/*.json`（9 语言）+ `index.js`（实例） | 在 json 里写插值外的 JS 逻辑 |
| `src/seo/` | 客户端 SEO（动态 head/json-LD） | 与视图耦合 |
| `scripts/*.mjs` | 构建期 Node 脚本（`ensure-deps`、`generate-sitemap`） | 被浏览器打包 |

- 视图文件命名：`PascalCase` 且以 `View` 结尾（如 `WatermarkView.vue`）。
- 组件文件命名：`PascalCase`（如 `ImagePicker.vue`）。
- 工具 / composable / config：`camelCase.js`。

---

## 2. 命名约定

- **变量 / 函数**：`camelCase`。布尔以 `is` / `has` / `can` 开头（如 `isCompactNav`、`busy`）。
- **常量 / 配置**：`UPPER_SNAKE_CASE`（如 `AI_MAX_EDGE`、`WATERMARK_FONTS`）。
- **组件内 ref**：语义化，避免 `data1`、`tmp`；类型不明的非响应式对象用 `let xxx = null` 并加 `@type` JSDoc（参考 `WatermarkView.vue` 的 `dragWM` / `resizeWM`）。
- **事件 emit**：`kebab-case`（`@file`、`@change`）；**props**：`camelCase` 声明、`kebab-case` 在模板使用。
- **i18n key**：点分路径，全部小写，层级为 `pages.{tool}.{field}` 或 `nav.*` / `footer.*` / `msg.*` / `seo.*`（参考 `usePageI18n`）。

---

## 3. 组件（`<script setup>`）规范

### 3.1 结构顺序
`<script setup>` 内建议顺序：**import → props/emit → 常量 → ref/reactive 状态 → computed → 监听器 watch → 生命周期 → 方法**。保持与既有文件一致（参考 `CompressView.vue`、`BlurRegionView.vue`）。

### 3.2 资源释放（强制）
任何注册到全局 / DOM 的监听器、Observer、第三方实例，**必须在 `onBeforeUnmount` 释放**：
- `URL.createObjectURL` → 用完立即 `revokeObjectURL`，并在卸载时再兜底一次（参考 `WatermarkView.vue:194-199, 250-256, 480-486`）。
- `ResizeObserver` → `disconnect()`（参考 `BlurRegionView.vue:40-45, 121-127`）。
- `window` / `document` 事件监听 → `removeEventListener`（参考 `BlurRegionView.vue:180-186, 121-127`）。
- Cropper 实例 → `destroy()`（参考 `CropView.vue:76-82, 137-140`）。
- `setTimeout` / `setInterval` 句柄 → `clearTimeout` / `clearInterval`。

### 3.3 错误处理与用户反馈（强制）
处理型视图统一使用 **`busy` 态 + `try/catch/finally` + `ElMessage`** 三段式（参考 `CompressView.vue:21-59`、`UpscaleView.vue:114-132`）：
- 进入前 `busy.value = true`；`finally` 中复位 `busy.value = false`（防止异常后按钮永久禁用）。
- 关键失败路径 `console.error(e)` 便于排查，并向用户 `ElMessage.error(...)`。
- 前置校验（未选文件 / 参数为非法值）用 `ElMessage.warning` 提前返回，不进入处理。

### 3.4 避免主线程长时间阻塞
纯 JS 逐像素 / 大图操作（如 `colorKey`、`resizeCanvasUpscale`）对超大输入要：
- 设上限（参考 `UpscaleView.vue:19` `AI_MAX_EDGE=1024`、`UpscaleView.vue:52` `maxPx=12000*12000`）；
- 优先使用分块 / 多步插值 / Worker（`OffscreenCanvas`）—— 新增同类算法时默认考虑 Worker。

---

## 4. 组合式函数（composables）规范

- 仅封装**有状态且跨页复用**的逻辑；纯算法放 `utils`。
- 入参用 `string` 标识页（`usePageI18n(pageKey)`），返回稳定引用，避免每次渲染新建函数。
- 不得在 composable 内直接 `import` 视图或发起路由跳转。

---

## 5. 工具函数（utils）规范

- **纯函数优先**：输入 → 输出，不读全局可变状态、不弹 UI（参考 `colorKey.js`、`skeletonGenerator.js`）。
- 必须 **JSDoc 标注参数与返回类型**，尤其是 `@param {ImageData}`、`@returns {string}` 等（参考 `skeletonGenerator.js:48-55`）。
- 对外 API 做**最小防御**：对可能为空 / 非预期的输入提前 `return` 兜底（参考 `generateSkeletonHtml` 对 `doc.body` 缺失返回空文档）。
- 算法类函数（图像处理）对超大输入必须有**边界保护或分块**，不得假设输入尺寸可控。

---

## 6. 国际化（i18n）规范

- 9 种语言（`zh/en/es/fr/de/ja/pt/ru/ar`）的 key **必须完全对齐**：新增 / 删除一个 key 要同步 9 个 json（建议 CI 校验 key 一致性，见 §11）。
- `DEFAULT_LOCALE='en'`，`fallbackLocale: ['en','zh']`（`i18n/index.js:18`）。缺失 key 会静默回退，造成页面混语言——**不允许依赖回退掩盖遗漏**。
- `RouterView` 外层 `LocaleLayout` 负责按路径 `:locale` 设置 `i18n.global.locale`（`LocaleLayout.vue:17-23`），不得与 `router.beforeEach` 重复设置造成竞态。
- 语言切换 / 文案随 `locale` 变化时，用 `watch(locale, fn, { immediate: true })` 同步默认值（参考 `MemeView.vue:18-25`、`WebSkeletonView.vue:28-34`）。

---

## 7. 路由与 SEO 规范

- 路由结构：`/：locale（9 选一）` 为前缀，`LocaleLayout` 包裹 `home` + 12 工具 + `not-found`（`router/index.js:51-59`）。
- 任何新工具必须同时：① 在 `config/tools.js` 登记（slug/name/seoPage/icon/color）；② 在 `router/index.js` 加子路由 + `meta.seoPage`；③ 在 9 个 `locales/*.json` 补 `tools.{slug}.*` 与 `pages.{slug}.*`；④ `sitemap` 脚本会自动覆盖。
- 客户端 SEO：`applyRouteSeo`（`seo/updateHead.js`）负责 title/description/OG/Twitter/canonical/hreflang/json-LD，新增页面只需保证 `meta.seoPage` 与 `seo.titles.*` / `seo.descriptions.*` key 对齐。
- **`index.html` 的静态 `title`/`description`/`lang` 只是无 JS 时的兜底**，必须与动态 SEO 语义一致，不得硬编码与默认语言冲突的内容（当前 `index.html` 硬编码中文 `lang=zh-CN` 与 `DEFAULT_LOCALE='en'` 不一致，属待修复项）。

---

## 8. 安全规范（强制）

### 8.1 禁止把用户内容注入主文档
- **严禁**用 `v-html` / `innerHTML` 直接渲染用户粘贴的任意 HTML 到**主文档**（`HtmlToImageView.vue:91` 的 `v-html="htmlInput"` 违反此条，必须改为 sandbox iframe `srcdoc` 渲染预览）。
- 需要渲染用户 HTML 时，使用 `<iframe sandbox="allow-same-origin">` + `srcdoc`（参考 `WebSkeletonView.vue:221-228, 239-248` 的安全做法），且**不得加 `allow-scripts`**，避免脚本执行。
- `html2canvas` 调用**禁止 `allowTaint: true`**（参考 `HtmlToImageView.vue:34`、`WebSkeletonView.vue:147`）：tainted canvas 在 `toBlob`/`toDataURL` 时抛 `SecurityError`，且应在 Promise 化的 `toBlob` 外包 `try/catch`。

### 8.2 外部资源
- 注入外部 CDN（如 Google Fonts，`WatermarkView.vue:18-34`）必须有失败兜底（字体加载失败回退系统字体），不得阻塞主流程。
- 预览图、blob URL 等本地资源**不需要** `crossorigin` 属性（参考 `RemoveBgView.vue:116` 属冗余，应移除）。

### 8.3 输入校验
- 文件选择（`ImagePicker.vue:22`）已校验 `raw.type.startsWith('image/')`；任何接收 `File` 的入口都需此校验。
- 数值型用户输入（滑块 / 输入框）在用于计算前必须 `clamp` / `Number.isNaN` 兜底（参考 `WebSkeletonView.vue:36-40`、`BlurRegionView.vue:61-66`）。

---

## 9. 性能与资源释放

- `URL.createObjectURL` 成对 `revoke`（见 §3.2）。
- 大图处理：缩放用 pica（Lanczos）或分块（`image.js` 的 `resizeCanvasWithPica` / `resizeCanvasUpscale`），AI 超分用 `patchSize` 分块 + WebGL 失败回退 CPU（`aiUpscale.js:104-110`）。
- 避免在主线程同步遍历超大量像素（`colorKey.js` 逐像素循环对 4000×4000 级图片会卡顿数秒，新算法默认考虑 Worker）。
- `html2canvas` / AI 推理等耗时操作用 `busy` 态 + 进度条（`ToolProgressBar.vue`）反馈。

---

## 10. 无障碍（a11y）

- 交互元素给 `aria-label`（`BlurRegionView.vue:347-366` 手柄）；自定义滑块用 `role="slider"` + `aria-valuenow/min/max`（`RotateView.vue:209-213`）。
- 进度 / 状态变化用 `aria-live="polite"` 或 `role="status"`（`ToolProgressBar.vue:27`、`NotFoundView.vue:35`）。
- 颜色对比、焦点态要可感知（Element Plus 默认已较好，自定义组件需自查）。

---

## 11. 提交与门禁（强制，待补齐）

当前 `package.json` 仅有 `dev/build/preview/sitemap`，**缺少质量门禁**。必须补齐：

- **类型检查**：项目为纯 JS；若维持 JS，至少引入 `eslint` + `@vitejs` 相关规则；若引入 TS，加 `vue-tsc --noEmit`。
- **Lint**：`eslint`（`vue` + `js` 规则），CI 中 `npm run lint` 非零退出即失败。
- **测试**：核心纯函数（`colorKey`、`skeletonGenerator`、`image` 的 resize / 数据转换）用 Vitest 覆盖边界（空输入、超大尺寸、异常类型）。
- **i18n key 一致性**：脚本校验 9 个 json 的 key 集合一致，CI 中失败即阻断。
- **构建门禁**：CI 跑 `npm ci && npm run build`，确保 `ensure-deps` 通过后产物可构建。
- 提交前自查：无残留 `console.log`、无 `.only`、资源释放齐全。

---

## 12. 反模式清单（禁止）

- ❌ 在主文档 `v-html` / `innerHTML` 渲染用户内容。
- ❌ `html2canvas` 配 `allowTaint: true` 且 `toBlob` 不在 `try/catch` 内。
- ❌ 注册全局监听 / Observer / ObjectURL / 第三方实例而不在 `onBeforeUnmount` 释放。
- ❌ 处理流程不设 `busy` 态或在 `catch`/`finally` 之外复位，导致按钮永久禁用。
- ❌ 新增工具页却不同步 `tools.js` + 路由 + 9 语言 + sitemap（漏一项即破坏 SEO / 导航）。
- ❌ 在 `utils` 里触发 `ElMessage` / 路由跳转等副作用。
- ❌ 跨页复制粘贴同一段 `process()` 样板而不提取 composable。
- ❌ 部署配置多平台混用（Vercel / Netlify / Apache 配置同时存在）——**本项目目标平台已定为 Netlify**，只维护 `netlify.toml` + `netlify/` + `public/_redirects`，勿再引入其他平台配置文件。
