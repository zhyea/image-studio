# image-studio｜纯浏览器图片处理工具箱

> 参加 WorkBuddy「1024 造物挑战」程序员节应用创作大赛

## 一句话
用 WorkBuddy 从零做出、全程在 WorkBuddy 里开发的**纯前端图片处理 Web 应用**：13+ 工具、浏览器本地运行、图片**无需上传服务器**，隐私零风险。

## 它能做什么（全部真实可跑，非 demo）
- 去背（色键抠图，超大图分块处理不卡顿）
- 压缩 / 格式转换（JPG·PNG·WebP）/ 改尺寸 / 裁剪 / 旋转
- 区域模糊 / 水印 / AI 超分辨率放大（TensorFlow.js + 分块）
- HTML 转图 / 网页骨架截图 / Meme 生成
- 9 语种国际化（中/英/西/法/德/日/葡/俄/阿）

## 为什么值得做（场景价值）
市面上的在线图片工具几乎都要把图传到云端处理。image-studio 所有计算都在浏览器本地完成，图片不出本机——处理含隐私 / 工作机密的图片时尤其关键。

## 用 WorkBuddy 做了什么（开发全过程）
- 技术栈：Vue 3 + Vite + Element Plus，纯 JavaScript（零 TypeScript 负担）
- 先让 WorkBuddy 做代码评审，再分批修复 🔴 阻塞与 🟡 建议
- 自建**零依赖质量门禁**：用 Node 22 内置 `node:test` 写单测 + i18n key 一致性校验脚本，每次改动都跑 `build / test / i18n` 三道门禁收口（当前 **65/65** 测试通过、9 语言 224 key 一致）
- 部署收敛到 Netlify（含 SEO Edge Function）

## 几个我满意的技术点
- `useImageProcess` 组合式函数统一 12 个视图的加载态与错误兜底，**从机制上杜绝「按钮永久转圈」**
- 色键去背对超大图做分块协作式渲染，消除主线程冻结，且输出与同步版**逐像素等价（数据零丢失）**
- 输出格式（mime / 扩展名 / 质量）统一到 `inferOutput`，替换三处散落逻辑

## 体验地址
https://image-studio-91108.app.workbuddy.host/?sharecode=LAE5CX5INN

（WorkBuddy「1024 造物挑战」托管链接，纯静态预渲染，浏览器本地处理图片，无需上传服务器）
