# Image Studio 代码评审检查清单（REVIEW CHECKLIST）

> 用法：每次 PR / 提交前逐项勾选。优先级：🔴 blocker（必须修）｜🟡 suggestion（应当修）｜💭 nit（可选优化）。
> 配套文档：`CODING_STANDARDS.md`、`CODE_REVIEW_REPORT.md`。

---

## 🔴 Blockers（必须修复）

- [ ] **安全：用户 HTML 未隔离渲染**
  - 检查任何 `v-html` / `innerHTML` / `insertAdjacentHTML` 是否渲染用户可控内容。
  - 用户粘贴的 HTML 必须进 `sandbox` iframe（`srcdoc`），**不**允许注入主文档。
  - 参考反例：`HtmlToImageView.vue:91`（`v-html="htmlInput"`）。
- [ ] **安全：外部资源 / 脚本执行面**
  - 渲染用户 HTML 的 iframe 不得带 `allow-scripts`。
  - 禁止 `html2canvas` 使用 `allowTaint: true`（tainted canvas 的 `toBlob` 抛 `SecurityError`）。
  - 参考：`HtmlToImageView.vue:34`、`WebSkeletonView.vue:147`。
- [ ] **正确性：异步 `toBlob` 异常未兜底**
  - `canvas.toBlob(cb)` 若在 tainted canvas 上同步抛错，回调不执行 → `busy` 永久挂起 + 未捕获异常。必须 Promise 化 `toBlob` 并 `await`/`try-catch`。
  - 参考：`HtmlToImageView.vue:38-52`、`WebSkeletonView.vue:152-166`。
- [ ] **安全：文件类型校验**
  - 所有接收 `File` 的入口必须校验 `file.type.startsWith('image/')`。
  - 参考：`ImagePicker.vue:22`（已做，新入口须沿用）。

---

## 🟡 Suggestions（应当修复）

- [ ] **资源释放**：`URL.createObjectURL` / `ResizeObserver` / `window` 事件 / Cropper / `setTimeout` 是否在 `onBeforeUnmount` 释放。
- [ ] **错误处理**：处理流程是否 `busy` 态 + `try/catch/finally`，且 `finally` 复位 `busy`（防按钮永久禁用）。
- [ ] **输入校验**：滑块 / 数值输入是否 `clamp` / `Number.isNaN` 兜底；参数非法是否 `ElMessage.warning` 提前返回。
- [ ] **主线程阻塞**：纯 JS 逐像素 / 大图操作是否设尺寸上限或分块 / Worker（`colorKey.js`、`resizeCanvasUpscale` 等）。
- [ ] **重复代码**：是否复制粘贴 `process()` 样板而未提取 composable（建议 `useImageProcess`）。
- [ ] **边界保护**：大图是否有 `AI_MAX_EDGE` / `maxPx` / `constrainImageMaxEdge` 类上限。
- [ ] **i18n 完整性**：新增 / 修改文案是否同步 9 个 `locales/*.json`，且有 CI 校验 key 一致。
- [ ] **路由 / SEO 一致性**：新工具是否同步 `config/tools.js` + `router/index.js(meta.seoPage)` + 9 语言 + sitemap。
- [ ] **输出格式判断**：`outputMime()` / 扩展名推导逻辑是否集中为 helper，而非在多个 view 重复。
- [ ] **i18n 设置单一来源**：是否存在 `router.beforeEach` 与 `LocaleLayout` 重复设置 `i18n.global.locale` 的竞态。
- [ ] **index.html 静态兜底**：`title` / `description` / `lang` 是否与 `DEFAULT_LOCALE` 和动态 SEO 语义一致。
- [ ] **部署配置**：目标平台为 Netlify，是否只维护 `netlify.toml` + `netlify/` + `public/_redirects`（未再混入 `vercel.json` / `.htaccess` 等其他平台配置）。
- [ ] **文档**：`README.md` 是否为真实项目说明（非 Vue 模板默认文案）。
- [ ] **门禁**：是否补齐 lint / typecheck / test / i18n-key 校验 / build CI。

---

## 💭 Nits（可选优化）

- [ ] **命名 / 类型**：非响应式复杂对象是否加 JSDoc `@type`（`dragWM` / `resizeWM` 风格）。
- [ ] **冗余属性**：blob URL 预览 img 是否多余 `crossorigin="anonymous"`（参考 `RemoveBgView.vue:116`）。
- [ ] **组件复杂度**：单文件超长（如 `WatermarkView.vue` > 1000 行）是否可按"拖拽逻辑 / 绘制逻辑 / 表单"拆分。
- [ ] **外部依赖可达性**：Google Fonts 等外链在弱网环境是否有兜底（已部分处理）。
- [ ] **样式一致性**：散落的 `:deep(.el-xxx)` 覆盖是否与 Element Plus 主题变量一致，避免硬编码色值。
- [ ] **魔法数字**：重复出现的 padding / 阈值是否提取为命名常量。

---

## 维度速查（评审时逐条对照）

### 正确性
- [ ] 边界条件（0 尺寸、除零、空输入、超大输入）有处理。
- [ ] 异步流程 `busy` 在所有出口复位。
- [ ] 文件下载文件名 / 扩展名与输出格式一致。

### 安全
- [ ] 无主文档注入用户内容；iframe 用 `sandbox` 且不含 `allow-scripts`。
- [ ] `html2canvas` 不用 `allowTaint`。
- [ ] 文件类型 / 用户输入有校验。
- [ ] 外部资源失败有兜底。

### 可维护性
- [ ] 目录职责清晰（view / component / composable / util / config / i18n 不混）。
- [ ] 重复逻辑已提取。
- [ ] 命名语义化、JSDoc 到位。
- [ ] 无魔法数字、无大段注释掉的代码。

### 性能
- [ ] 大图有上限 / 分块 / Worker。
- [ ] 重依赖（tfjs / pica / html2canvas）按需动态 `import` 且 `optimizeDeps` 预打包。
- [ ] 无不必要的重渲染 / 重复计算。

### 资源释放
- [ ] ObjectURL / Observer / 事件 / 第三方实例 / 定时器全部在卸载时释放。

### 国际化与 SEO
- [ ] 9 语言 key 对齐；`meta.seoPage` 与 `seo.titles/descriptions` 对齐。
- [ ] 静态 `index.html` 兜底与新语言策略一致。

### 无障碍
- [ ] 交互元素 `aria-label`；自定义控件 `role` + `aria-*`；状态变化 `aria-live`。

### 测试与门禁
- [ ] 核心纯函数有 Vitest 覆盖；lint / typecheck / build 在 CI 跑通。
