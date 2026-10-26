/**
 * 水印编辑区的布局 / 阈值常量（px）。
 * 原先以字面量散落在 WatermarkView.vue 中，提取后便于统一调整与复用到其他视图。
 */

/** 选区 chrome：wm-sel 边框 2px + 左右 padding 8+10（与 <style> 保持一致） */
export const WM_SEL_CHROME_PAD_X = 22
/** 同理，上下方向的 chrome 高度 */
export const WM_SEL_CHROME_PAD_Y = 22

/** 文本行高相对字号的比例 */
export const WM_LINE_HEIGHT_RATIO = 1.25

/** 初始水印框宽度（px） */
export const WM_DEFAULT_BOX_W = 240

/** 默认高度所依据的基准字号（px） */
export const WM_BASE_FONT_SIZE = 24

/** textarea 最小可视宽度（px），避免极窄时输入体验差 */
export const WM_MIN_TEXTAREA_W = 48

/** 水印框尺寸钳制范围（px） */
export const WM_BOX_MIN_W = 88
export const WM_BOX_MAX_W = 1600
export const WM_BOX_MAX_H = 1200
