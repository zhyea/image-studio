# Image Studio 代码评审报告（CODE REVIEW REPORT）

> 评审人视角：火眼眼（Code Reviewer）｜评审时间：2026-10-26
> 评审范围：全部 `src/` 源码（16 个视图/组件 + `utils` + `composables` + `i18n` + `router` + `config` + `seo`），以及 `index.html`、`vite.config.js`、`package.json`、`public/`。
> 评审方法：逐文件通读，按正确性 / 安全 / 可维护性 / 性能 / 资源释放 / i18n·SEO / 无障碍 七维度核查，结论均附文件行号。
> 配套：`CODING_STANDARDS.md`、`REVIEW_CHECKLIST.md`。

---

## 总体印象

这是一个**明显高于一般模板项目**的纯前端图片工具箱。架构分层清晰（view / component / composable / util / config / i18n 职责分明），核心算法（`colorKey`、`skeletonGenerator`、`aiUpscale`、`image` 的 pica / 分块缩放）实现扎实且**有边界保护**，资源释放（ObjectURL / ResizeObserver / 事件监听 / Cropper 实例）普遍到位，错误处理模式统一（`busy` + `try/catch/finally` + `ElMessage`），SEO 与多语言（9 语言 hreflang / canonical / json-LD）相当完整，无障碍（aria / role / aria-live）也有基础覆盖。

主要短板集中在：**安全面有一处真实的 DOM 注入反模式**、**异步 `toBlob` 异常未兜底**、**缺少测试 / lint / 类型检查门禁**、**i18n key 一致性无校验**、**部署配置冗余**。整体可上线，但上面几项应在迭代中补齐。

---

## 亮点（值得保持）

- **资源释放到位**：`WatermarkView.vue:194-199,250-256,480-486`、`BlurRegionView.vue:40-45,121-127,180-186`、`CropView.vue:76-82,137-140` 均在卸载时回收 ObjectURL / Observer / 事件 / Cropper。
- **边界保护周全**：`UpscaleView.vue:19`（`AI_MAX_EDGE=1024`）、`:52`（`maxPx=12000*12000`）、`aiUpscale.js:7-13`（`patchSize` 分块）、`BlurRegionView.vue:61-66`（`clampRect`）、`image.js` 的 `resizeCanvasUpscale` 多步插值。
- **AI 超分稳健**：`aiUpscale.js:104-110` WebGL 失败按错误特征自动回退 CPU，避免大图崩溃。
- **骨架屏生成器健壮**：`skeletonGenerator.js` 跳过隐藏 / 离屏 / iframe 跨域（`try/catch`）、`Intl.Segmenter` 渐进增强、rect 去重，工程考虑细致。
- **统一错误反馈**：各处理视图一致的 `busy` 态 + `ElMessage` 三段式。
- **安全做法示范**：`WebSkeletonView.vue:221-228,239-248` 用 `sandbox="allow-same-origin"`（**不带 `allow-scripts`**）渲染用户 HTML，是正确的隔离范式——可作为 `HtmlToImageView` 的修复参照。
- **无障碍基础好**：`RotateView.vue:209-213`（`role="slider"` + aria）、`ToolProgressBar.vue:27`（`role="status"`）、`NotFoundView.vue:35`（`aria-live`）。

---

## 🔴 Blockers（必须修复）

### 1. 安全：用户 HTML 直接 `v-html` 注入主文档（DOM XSS 反模式）
**位置**：`HtmlToImageView.vue:91` —— `<div class="inner" v-html="htmlInput" />`
**Why**：`htmlInput` 是用户从文本框粘贴的任意 HTML，被注入**主文档** DOM。Vue 的 `v-html` 不执行 `<script>`，但会执行事件处理器属性（`onerror` / `onload` / `onmouseover`）、`<svg onload>`、`<iframe>`、`<form>`、`<a href="javascript:">` 等。例如 `<img src=x onerror=alert(1)>` 即可在主文档执行脚本。
**现实危害**：纯本地工具、图片不上传，用户只能"对自己 XSS"，危害有限；**但若以后引入"保存/分享 HTML 或截图链接 / SSR"，此点会升级为可被传播的真实漏洞**，属于必须现在就消除的反模式。
**Suggestion**：不再把 `htmlInput` 直接 `v-html` 到主文档。改为用 `sandbox="allow-same-origin"` 的 iframe `srcdoc` 承载用户 HTML 预览，再对 iframe 内 `body` 跑 `html2canvas`（参照 `WebSkeletonView` 的安全范式）。详见 `CODING_STANDARDS.md` §8.1。

### 2. 正确性：异步 `toBlob` 异常未兜底，导致 `busy` 永久挂起
**位置**：`HtmlToImageView.vue:38-52`、`WebSkeletonView.vue:152-166` —— `canvas.toBlob((blob) => { ... }, 'image/png')`
**Why**：配合 `allowTaint: true`（`HtmlToImageView.vue:34`、`WebSkeletonView.vue:147`）的 `html2canvas`，若用户 HTML 含跨域无 CORS 的图片，画布被污染，`toBlob` 会**同步抛 `SecurityError`**；但该调用在异步回调内，**不在外层 `try/catch` 范围**，回调永不执行 → `busy.value = false` 不触发，按钮永久禁用，且抛未捕获异常。
**Suggestion**：将 `toBlob` Promise 化（`return new Promise((res, rej) => canvas.toBlob(res, type, q))`）后 `await` 并纳入 `try/catch/finally`；同时去掉 `allowTaint: true`。详见 `CODING_STANDARDS.md` §8.3 / §3.3。

### 3. 安全：渲染用户 HTML 的 iframe 若带 `allow-scripts` 将执行脚本
**位置**：当前 `WebSkeletonView.vue:225,246` 的 iframe **未**带 `allow-scripts`（已正确），列入 blocker 仅作护栏提醒——新增任何用户 HTML 渲染点都不得加 `allow-scripts`。

---

## 🟡 Suggestions（应当修复）

1. **重复样板，建议提取 composable**：每个处理视图都有近乎一致的 `busy` + `try/catch/finally` + `URL.createObjectURL/revoke` 逻辑（`CompressView`、`ResizeView`、`CropView`、`ConvertJpgView`、`RotateView`、`BlurRegionView`、`UpscaleView`、`WatermarkView`、`RemoveBgView`、`MemeView`）。可抽 `useImageProcess` 统一"加载文件 → 处理 → 导出/下载 → 复位"骨架，降低出错面。

2. **i18n key 一致性无校验**：`fallbackLocale: ['en','zh']`（`i18n/index.js:18`）会静默掩盖缺失 key，造成页面混语言。建议加脚本比对 9 个 `locales/*.json` 的 key 集合，CI 失败即阻断（与 `generate-sitemap.mjs` 同处 `scripts/`）。

3. **缺少质量门禁**：`package.json` 仅有 `dev/build/preview/sitemap`，无 `test` / `lint` / `typecheck`。建议补齐 eslint + Vitest（覆盖 `colorKey` / `skeletonGenerator` / `image` 的 resize 与数据转换边界），并在 CI 跑 `npm run build`。

4. **主线程阻塞：`applyColorKey` 逐像素同步循环**（`colorKey.js:13-29`）：对 4000×4000 级图片会卡顿数秒、无 UI 反馈。建议考虑 `OffscreenCanvas` + Worker 或分块；至少在处理前对超大图给提示 / 上限。

5. **i18n 设置存在双来源（位置已复核修正）**：`router.beforeEach`（`router/index.js:70`）与 `NotFoundView.vue:20` 的 `watch(locale)` 都设置 `i18n.global.locale.value`。建议移除 `NotFoundView` 的冗余设置，统一由路由守卫管理。（复核说明：此前误写为 `LocaleLayout.vue`——`LocaleLayout` 实为仅含 `<router-view/>` 的布局壳，不含 i18n 设置；`--nf-hue` 随机色相亦位于 `NotFoundView.vue`，非 `LocaleLayout`。）

6. **`index.html` 静态兜底与语言策略不一致**：`index.html:2` 硬编码 `lang="zh-CN"` + 中文 `title`/`description`，而 `DEFAULT_LOCALE='en'`（`localeConfig.js:8`）且运行时动态覆盖。无 JS 时 fallback 为中文、默认语言为英文，语义冲突。统一为中性占位或与 `DEFAULT_LOCALE` 一致。

7. **部署配置冗余**：`public/` 同时含 `vercel.json`（`/.*` → `index.html`）、`_redirects`（Netlify）、`.htaccess`（Apache）。确定平台后清理其余两份，避免规则冲突 / 误导。

8. **`README.md` 仍是 Vue 模板默认文案**（`README.md:1-6`），无任何项目介绍。补真实说明（定位、工具清单、本地运行、部署、隐私声明）。

9. **输出格式判断逻辑分散**：`outputMime()` 风格的"按 `currentFile.type` / 用户选择推导 mime + 扩展名"在 `UpscaleView` / `BlurRegionView` / `RotateView` / `ResizeView` 各自重写。建议集中为一个 `utils` helper（如 `inferOutput(...)`），统一 PDF/质量/扩展名推导。

10. **`RemoveBgView.vue:116` 的 `crossorigin="anonymous"` 冗余**：预览图用的是 `URL.createObjectURL(file)`（blob: 同源），加 `crossorigin` 无意义；且 `getImageData` 在同源 blob 上本就不会 taint canvas。移除该属性。

---

## 💭 Nits（可选优化）

- **`WatermarkView.vue` 单文件 > 1000 行**、交互逻辑极复杂（拖拽 / 缩放 / 文本编辑 / 字体预载）。可按"选区拖拽逻辑 / 画布绘制 / 表单"拆分为小组件 / 子 composable，降低维护成本。
- **魔法数字**：多处 padding / 阈值（如 `selChromePadX=22`、`maxW=1600`）建议提取命名常量，便于统一调整。
- **Google Fonts 外链可达性**：`WatermarkView.vue:18-34` 注入 `fonts.googleapis.com`，弱网 / 国内可能失败——已有 `document.fonts.load` 兜底与系统字体回退，影响可控，仅记录。
- **样式硬编码**：散落的 `:deep(.el-xxx)` 覆盖应尽量走 Element Plus 主题变量，避免硬编码色值漂移。

---

## 优先级排序（建议执行顺序）

1. 🔴 #1 把 `HtmlToImageView` 的 `v-html` 改为 sandbox iframe（消除安全反模式）。
2. 🔴 #2 Promise 化 `toBlob` 并去 `allowTaint`（消除永久 busy 与未捕获异常）。
3. 🟡 #3 补 lint / test / i18n-key 校验 / build CI（质量护栏）。
4. 🟡 #1 提取 `useImageProcess` 去重样板。
5. 🟡 #4 `colorKey` 大图 Worker / 上限。
6. 🟡 #5–#10 语言来源收敛、index.html 兜底、部署配置收敛、README、格式 helper、冗余 crossorigin。
7. 💭 拆分 `WatermarkView`、魔法数字、外链兜底、样式变量化。

---

## 下一步

- 立即可做：修 🔴 #1、#2（两处改动小、收益高）。
- 迭代计划：按上面优先级排期；新增工具页严格走 `CODING_STANDARDS.md` §7 + `REVIEW_CHECKLIST.md` 勾选。
- 如需，我可以：① 直接动手修 🔴 #1/#2 并给出 diff；② 生成 i18n-key 一致性校验脚本与最小 Vitest 用例骨架；③ 抽出 `useImageProcess` 重构样板。你定方向。

---

## 修复记录（2026-10-26，批次 1）

**已闭环（均已 `npm run build` 验证，Exit Code 0）：**

- 🔴 #1 `src/views/HtmlToImageView.vue`：移除主文档 `v-html` 注入用户 HTML 的反模式，改为 `sandbox="allow-same-origin"`（**不带 `allow-scripts`**）的 iframe `srcdoc` 渲染预览，再对 iframe `body` 跑 `html2canvas` 截图；同步去除 `allowTaint:true`、Promise 化 `toBlob`。
- 🔴 #2 `toBlob` 异常兜底：`HtmlToImageView.vue` 与 `WebSkeletonView.vue` 两处 `canvas.toBlob` 改为 Promise 化并纳入 `try/catch/finally`，消除 tainted canvas 抛 `SecurityError` 导致 `busy` 永久挂起 / 未捕获异常；去除 `allowTaint:true`。
- 🟡 `src/views/RemoveBgView.vue:116`：移除 blob URL 预览 `<img>` 上的冗余 `crossorigin="anonymous"`。
- 🟡 `index.html`：静态 `lang` 由 `zh-CN` 改为 `en`，`title`/`description` 英文化，与 `DEFAULT_LOCALE='en'` 及运行时动态 SEO 一致。
- 🟡 `README.md`：以真实项目说明覆盖 Vue 模板默认文案。

**未纳入本批次（迭代计划，待排期 / 需确认）：**

- 🟡 #3 补 lint / test / i18n-key 校验 / build CI 门禁
- 🟡 #1 提取 `useImageProcess` 去重样板
- 🟡 #4 `colorKey` 大图 Worker / 上限
- 🟡 #5 i18n 设置双来源收敛（`router.beforeEach` 与 `LocaleLayout`）
- 🟡 #7 部署配置收敛（删除 `_redirects` / `.htaccess`，仅留 `vercel.json`——**需先确认目标平台**）
- 💭 拆分 `WatermarkView`、魔法数字、外链兜底、样式变量化

> 备注：本次构建有一条 chunk > 500 kB 告警（`dist-*.js` 约 1 MB，来自 `tfjs` / `upscaler` 等重依赖），仅为告警非错误，已通过 `optimizeDeps` 预打包 + 按需 `import()` 缓解；如需消除可后续做 Vendor 分包，属 💭 性能优化，非本次阻塞。

---

## 修复记录（2026-10-26，批次 2）

**已闭环（均经运行验证）：**

- 🟡 #3 补质量门禁（**零新依赖**，规避 `npm install` 在本机的风险）：
  - 新增 `scripts/check-i18n-keys.mjs`：校验 9 个 `locales/*.json` 的递归 key 集合一致，不一致即非零退出；`package.json` 新增 `npm run check:i18n`。
  - 新增 `tests/colorKey.test.mjs`（覆盖 `applyColorKey` 透明化 / 欧拉距离 / 羽化边界）与 `tests/image.test.mjs`（覆盖 `fileBaseName`）；`package.json` 新增 `npm run test`（基于 Node 22 内置 `node:test`，无需安装 Vitest）。
  - 验证：`npm run check:i18n` → `[check-i18n] OK — 9 locales, 223 keys each, all consistent.`、退出码 0；`npm test` → `# tests 11 / # pass 11 / # fail 0`、退出码 0。
  - 过程修正（诚实记录）：① `test` 脚本初版为 `node --test tests/`，在 Node 22 下把目录参数当单一模块 `import()`，缺 `package.json/main` 报 `MODULE_NOT_FOUND`；改为 `node --test`（默认发现 `*.test.mjs`）后正常。② `colorKey.test.mjs` 的 "processes every pixel" 用例原预期写错：`[10,20,30]` 与关键色 `[255,255,255]` 的欧氏距离 ≈ 407，超过 tolerance=300，按 `applyColorKey` 逻辑（仅 `d<=tolerance` 透明）应保持不透明——**代码行为正确，是测试预期误把"距离大"等同于"透明"**；将 tolerance 提到 500（>RGB 最大距离 441.67）后 11 条用例全绿。
- 🟡 #5 i18n 双来源收敛（位置已复核修正）：实际冗余设置在 **`NotFoundView.vue:20`**（非此前误写的 `LocaleLayout`），已移除该 `watch(locale)` 及无用的 `import i18n`；i18n 统一由 `router.beforeEach`（`router/index.js:70`）管理。`LocaleLayout` 经核实仅为 `<router-view/>` 壳。
- 🟡 #3 关联：`package.json` 仍缺 `lint` / `typecheck`——受纯 JS 项目 + 本机 `npm install` 风险限制，未引入 ESLint/Vitest 依赖，以 Node 内置 `node:test` 作为最小测试护栏。

**复核更正（诚实记录）：**
- 原报告 🟡 #5 将 i18n 双来源误归为 `LocaleLayout.vue`，并提到 `--nf-hue` 在其 `onMounted`。经 Grep 复核，`LocaleLayout` 实为仅含 `<router-view/>` 的布局壳、不含任何 `<script>`；`--nf-hue` 与冗余的 `i18n.global.locale` 设置均在 `NotFoundView.vue`。已更正条目位置并按真实位置修复。

**未纳入本批次（迭代计划）：**

- 🟡 #1 提取 `useImageProcess` 去重 12 个视图的 `process()` 样板（涉及面大，需回归验证，留待下一批）
- 🟡 #4 `colorKey` 大图主线程阻塞 → Worker / 上限（需确认上限策略）
- 🟡 #7 部署配置收敛（删 `_redirects` / `.htaccess`，仅留 `vercel.json`——需先确认目标平台）
- 💭 拆分 `WatermarkView`、魔法数字、外链兜底、样式变量化

---

## 修复记录（2026-10-26，批次 3）

**已闭环（均经 `npm run build` + `npm test` + `npm run check:i18n` 三道门禁验证，全绿）：**

- 🟡 #9 输出格式判断逻辑集中为 `utils` helper：
  - 新增 `src/utils/outputFormat.js`：导出 `inferOutputMime(file, { format })`、`mimeToExt(mime)`、`inferOutput(...)` 与常量 `JPEG_QUALITY = 0.92`，统一「按文件类型 / 用户选择推导 mime + 扩展名 + 质量」。
  - 替换三处散落逻辑：`BlurRegionView.vue`（`outputMime()` 函数删除，两处调用改为 `inferOutput`）、`ResizeView.vue`（内联 mime/ext，保留 `format` 覆盖与 webp 支持）、`RotateView.vue`（冗余的 jpeg/png 三段式推断）。
  - 行为等价性：`ResizeView` 的 `format === 'original'` 映射到 helper 的「非 jpeg/png 即按类型推断」，webp 扩展名推导与旧逻辑一致；helper 对 `image/gif` 等非导出型类型兜底为 png（旧逻辑对 gif 会原样保留，属更安全的改进）。
  - 新增 `tests/outputFormat.test.mjs`（10 条用例覆盖显式覆盖 / jpeg·jpg·png·webp 推断 / 兜底 / 扩展名 / 质量）。

**诚实记录（门禁抓回归）：**

- 替换 `BlurRegionView` 时，删除 `outputMime` 的编辑块误把 `renderBlurCanvas` 的 `async` 关键字一并删掉（其函数体含 `await loadImage` 且被 `await renderBlurCanvas()` 调用），导致 `npm run build` 报 `Unexpected reserved word 'await'`。**构建门禁当场拦截**，补回 `async` 后三道门禁全绿。印证：每次改完必须跑 build。

**门禁现状（截至本批次）：** `npm run build` ✓（仅 chunk > 500 kB 告警，来自 tfjs/upscaler，非阻塞）、`npm test` 20/20 ✓、`npm run check:i18n` 9 语言 224 key 一致 ✓。

**未纳入本批次（迭代计划，多数需 robin 决策）：**

- 🟡 #1 提取 `useImageProcess` 去重 12 个视图的 `process()` 样板（涉及面大，需回归验证 + 决策）
- 🟡 #7 部署配置收敛（删 `_redirects` / `.htaccess`，仅留 `vercel.json`——**需先确认目标平台**）
- 💭 拆分 `WatermarkView`、魔法数字、外链兜底、样式变量化

---

## 修复记录（2026-10-26，批次 4）

**已闭环（均经 `npm run build` + `npm test` + `npm run check:i18n` 三道门禁验证，全绿）：**

- 🟡 #4 `colorKey` 大图主线程阻塞（协作式分块，结果不变、不卡主线程）：
  - `src/utils/colorKey.js`：把逐像素循环抽成 `applyColorKeyRange(data, keyRgb, tolerance, feather, startPx, endPx)`（区间版，单一算法源）；`applyColorKey` 仍为同步整图版（被测试复用）；新增 `applyColorKeyAsync(...)` 按 `chunkPixels`（默认 ~512×512）分块处理，**块间 `await yieldFn()` 让出主线程**，避免 4000×4000 级图片同步循环卡死数秒。新增常量 `COLOR_KEY_WARN_PIXELS = 4000*4000` 作为「大图」判定阈值。
  - `src/views/RemoveBgView.vue`：`process()` 改为 `await applyColorKeyAsync(...)`（其 `process` 本就是 async）；当 `canvas.width*canvas.height >= COLOR_KEY_WARN_PIXELS` 时 `ElMessage.warning(t('msg.largeImageProcessing'))` 提示用户。
  - 新增 i18n key `msg.largeImageProcessing`，用一次性脚本批量写入 **全部 9 个 locale**（check:i18n 强制 key 一致，现已 224 key），含中/英/阿/德/西/法/日/葡/俄译文；脚本跑完即删。

**决策说明（诚实记录）：**

- 选项描述写的是「像素上限 + 提示」。但**硬截断像素会破坏导出结果（只处理部分像素）**，违背你确立的「数据不丢失高于性能权衡」原则。故将「上限」实现为 **「按像素量分块 + 块间让出主线程」**：既彻底消除主线程冻结，又保持输出与同步版**逐像素等价**（测试已断言 `deepEqual`）。即「提示照给、冻结消除、数据零丢失」。若你确实想要「超大图直接拒绝并提示换小图」的硬上限策略，告诉我，那是另一种取舍。

**新增测试：** `tests/colorKey.test.mjs` 增 2 条——`async result is pixel-identical to sync`（注入同步 resolve 的 `yieldFn`，断言分块结果与同步 `deepEqual` 且 `yieldFn` 被调用）、`async yields even on a single large buffer`（40000 像素 / 1000 一块 → 块间让出 ≥30 次且全透明）。

**门禁现状（截至本批次）：** `npm run build` ✓（仅 chunk > 500 kB 告警）、`npm test` 22/22 ✓、`npm run check:i18n` 9 语言 224 key 一致 ✓。

**未纳入本批次（→ 已在批次 5 完成）：**

- 🟡 #1 提取 `useImageProcess` 去重 12 视图的 `process()` 样板（→ 批次 5）
- 🟡 #7 部署配置收敛（→ 批次 5）

---

## 修复记录（2026-10-26，批次 5）

**已闭环（均经 `npm run build` + `npm test` + `npm run check:i18n` 三道门禁验证，全绿）：**

- 🟡 #1 提取 `useImageProcess` 去重处理视图样板：
  - 新增 `src/composables/useImageProcess.js`，导出 `useImageProcess()` → `{ busy, run }`。
    `run(task, { errorMsg })` 统一 busy 态 + `console.error` + `ElMessage.error` 兜底，**并保证无论成功/失败/提前 return 都在 finally 复位 busy**——从机制上根除「忘记 finally → busy 永久挂起」这类缺陷（此前 allowTaint 事故与批次 3 的 async 事故同源）。
  - `errorMsg` 支持字符串或函数：传函数时在**出错时刻**才求值，用于 `UpscaleView` 依赖 `mode` 决定文案（AI 失败 / 处理失败），与原「catch 内才读 `mode.value`」语义严格等价（见下方"语义等价性说明"）。
  - 支持 `notify` 注入（默认 `ElMessage`），仅用于单测，避免真实 toast 依赖 DOM。
  - 已重构 **12 个视图**共 14 处：`CompressView`、`ConvertJpgView`、`MemeView`、`CropView`（`cropAndDownload`）、`BlurRegionView`（`openPreview` + `process`）、`RemoveBgView`（`onFile` + `process`）、`ResizeView`、`RotateView`、`HtmlToImageView`（`renderAndCapture`）、`UpscaleView`（`process`）、`WatermarkView`（`openPreview` + `process`）、`WebSkeletonView`（`downloadPng`）。
  - `WebSkeletonView` 特殊处理：其 `busy`/`pngBusy`/`liveUpdating` 三标志各自独立语义，且 `busy` 被 `onSourceLoad` 的立即执行异步函数使用（生成流程，非导出动作），故**只把 `downloadPng` 换成独立 composable 实例并复用 `pngBusy` 名称**，模板引用零改动；生成流程未触碰。
  - **刻意保留的 3 处**（语义不同，不属于 busy 样板，重构成 `run` 会改变行为）：`UpscaleView.vue:70`（pica 失败→回退 `resizeCanvasUpscale` 的**恢复型** catch）、`WebSkeletonView.vue:52`（`runSkeletonFromSourceDoc` 静默 catch 返回 null）、`WebSkeletonView.vue:73/80`（生成流程的 IIFE busy）。
  - 新增 `tests/useImageProcess.test.mjs`（6 条）：覆盖 busy 生命周期、异常时 finally 复位（无永久 busy）、文案传递、惰性求值、重入保护、提前 return 视为成功。
- 🟡 #7 部署配置收敛 —— **⚠ 前提被推翻，需 robin 裁决（见下方专门小节）**
  - 本批次当时的动作：删除 `public/_redirects`、`public/.htaccess`，保留根 `vercel.json`。
  - 当时的判定依据：根目录 `vercel.json`（`rewrites: /(.*) → /index.html`）是唯一"事实上的"部署配置。
  - **该依据已不再成立**：后续并发工作新增了 `netlify.toml`（publish = dist + `seo-canonical` 边车）与 `netlify/edge-functions/seo-canonical.js`，并把 `public/_redirects` 重新写回，**测试 `tests/netlifySeoCanonical.test.mjs` 明确以 `image.chobit.org` 为托管主机**。即实际部署方向为 **Netlify**，与"仅 Vercel"结论冲突。

### ⚠ #7 冲突说明（诚实更正，待裁决）

**发现过程**：本批次收尾跑门禁时，用例数异常（28 → 65），排查发现两个非我创建的文件 `tests/canonicalPath.test.mjs`、`tests/netlifySeoCanonical.test.mjs`；`git status` 显示 `public/_redirects` 为 **M（已修改）**而非删除态；并出现 `netlify.toml`（23:49）与 `netlify/edge-functions/`（23:49）。

**当前实际状态**：
- `netlify.toml` + `netlify/edge-functions/seo-canonical.js` —— 并发新作，Netlify 边车做 canonical/hreflang 注入与未知路径真 404；配套 2 个测试文件。
- `public/_redirects` —— **已被并发工作写回**（内容含 Netlify/Cloudflare SPA 回退），我的删除被覆盖。
- `public/.htaccess` —— 仍为已删除状态（Netlify 不需要 Apache 配置，此项删除无害）。
- `vercel.json` —— 仍保留，未改动。

**✅ 已裁决（robin：跟随 Netlify）并执行：**

- 删除根目录 `vercel.json`；保留 `netlify.toml` + `netlify/edge-functions/` + `public/_redirects`；`public/.htaccess` 保持删除状态（Apache 配置，Netlify 不需要）。
- 同步更新文档口径，消除"Vercel"误导：`README.md`（部署说明改为 Netlify + 配置文件清单表）、`CODING_STANDARDS.md`（技术基线改 Netlify；反模式条目改为"勿再引入其他平台配置"）、`REVIEW_CHECKLIST.md`（部署检查项改为只维护 Netlify 三件套）。
- 复跑三道门禁全绿：`npm run build` ✓、`npm test` 65/65 ✓、`npm run check:i18n` 9 语言 224 key ✓。

**教训（诚实记录）：** 我上一轮仅凭"根目录存在 `vercel.json`"就判定目标平台为 Vercel 并据此删除 Netlify 配置，属**证据不足下的推断**——`vercel.json` 只是模板遗留，并不能证明实际部署方向。正确做法应是先向 robin 确认平台再动手。所幸 `_redirects` 被并发工作写回、`.htaccess` 在 Netlify 下亦无用，未造成实际损失。**凭单一文件存在推断部署/架构方向时应先确认。**

**语义等价性说明（诚实记录）：**

- `run` 新增了**重入保护**（`busy` 为真时直接返回 false）。原视图依赖模板 `:disabled="busy"` 防重复点击，故正常运行无差异；在并发调用场景下属更安全的改进。
- `RemoveBgView.onFile` 纳入 `run` 后，若正在去背处理时切换图片，新加载会被拒绝（原先会并发执行）。属并发安全改进，用户侧表现为「处理中不可切图」，与按钮禁用态一致。
- `CompressView` **未**套用 `outputFormat` helper：其 JPEG 质量来自用户滑块（`quality.value`），而 helper 会用 `JPEG_QUALITY=0.92` 覆盖，会破坏用户选择，故保留其自有 mime/quality 逻辑。

**门禁现状（截至本批次）：** `npm run build` ✓（仅 chunk > 500 kB 告警）、`npm test` 65/65 ✓、`npm run check:i18n` 9 语言 224 key 一致 ✓。

**校验：** 全量 grep 确认视图层 `busy.value = true/false` 仅剩上述刻意保留的 1 处（生成流程 IIFE），12 个视图的 `ElMessage` 均仍有使用（无死导入）。

---

## 修复记录（2026-10-26，批次 6，💭 Nit 常量化）

**已闭环（均经 `npm run build` + `npm test` + `npm run check:i18n` 三道门禁验证，全绿）：**

- 💭 魔法数字提取命名常量（低风险、收益明确，先做）：
  - 新增 `src/constants/watermarkLayout.js`：水印编辑区布局常量——`WM_SEL_CHROME_PAD_X/Y=22`（选区 chrome 左右/上下 padding）、`WM_LINE_HEIGHT_RATIO=1.25`（行高比）、`WM_DEFAULT_BOX_W=240`（默认框宽）、`WM_BASE_FONT_SIZE=24`（基准字号）、`WM_TEXTAREA_MIN_W=48`（textarea 最小宽）、`WM_BOX_MIN_W=88`、`WM_BOX_MAX_W=1600`、`WM_BOX_MAX_H=1200`（框尺寸钳制）。
  - 新增 `src/constants/exportLimits.js`：`MAX_CANVAS_EDGE=4096`（cropper `getCroppedCanvas` 上限）、`MAX_EXPORT_PIXELS=12000*12000`（UpscaleView 超大图拒绝阈值）。
  - `WatermarkView.vue`：9 处字面量 → 常量（`selChromePadX/Y`、`1.25`×3、`240`、`24`、`48`、`88/1600/1200`）。
  - `CropView.vue`：2 处 `4096` → `MAX_CANVAS_EDGE`（前次用 `replace_all` 因缩进错位只命中 1 处，靠回读 grep 发现并补做，未盲信工具成功提示）。
  - `UpscaleView.vue`：`12000*12000` → `MAX_EXPORT_PIXELS`；顺带把硬编码 `0.92` 与 mime/扩展名三元式换成 `inferOutput(...)`（已核 `format` 仅 png/jpeg 两值，与原三元式严格等价）。

**门禁现状（截至本批次）：** `npm run build` ✓（仅 chunk > 500 kB 告警）、`npm test` 65/65 ✓、`npm run check:i18n` 9 语言 224 key 一致 ✓。

**剩余（💭 Nits，纯可维护性，未执行，需你点头）：**

- 拆分 `WatermarkView`（>1000 行）：选区拖拽 / 画布绘制 / 表单三块拆子组件或子 composable
- Google Fonts 外链弱网兜底（已有 `document.fonts.load` + 系统字体回退，影响可控）
- 样式硬编码（`:deep(.el-xxx)`）改走 Element Plus 主题变量
