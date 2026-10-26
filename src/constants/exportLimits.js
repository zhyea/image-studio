/**
 * 导出尺寸上限。原先以字面量散落在多个视图中（CropView 4096、UpscaleView 12000×12000），
 * 提取后可跨视图统一调整，并便于在文档中说明取值依据。
 */

/** 导出画布单边上限（px）：钳制 cropper / 缩放输出，避免超大 canvas */
export const MAX_CANVAS_EDGE = 4096

/** 导出像素总量上限：超过该值浏览器 canvas 易分配失败（空白或异常） */
export const MAX_EXPORT_PIXELS = 12000 * 12000
