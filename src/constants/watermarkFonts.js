/**
 * 水印可选字体：均为开源许可证（SIL OFL 1.1 或 Apache-2.0），进入水印页时由 WatermarkView 注入 Google Fonts 样式表加载。
 * @see https://fonts.google.com/attribution
 */
export const WATERMARK_GOOGLE_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&family=Inter:wght@400;700&family=Noto+Sans+SC:wght@400;700&family=Noto+Sans:wght@400;700&family=Roboto:wght@400;700&family=Source+Sans+3:wght@400;700&display=swap'
export const WATERMARK_FONTS = [
  {
    id: 'noto-sc',
    labelKey: 'fontNotoSc',
    /** CSS / Canvas font-family，与 Google Fonts 中名称一致 */
    family: '"Noto Sans SC", sans-serif',
    license: 'OFL-1.1',
  },
  {
    id: 'noto-sans',
    labelKey: 'fontNotoSans',
    family: '"Noto Sans", sans-serif',
    license: 'OFL-1.1',
  },
  {
    id: 'inter',
    labelKey: 'fontInter',
    family: '"Inter", sans-serif',
    license: 'OFL-1.1',
  },
  {
    id: 'source-sans-3',
    labelKey: 'fontSourceSans3',
    family: '"Source Sans 3", sans-serif',
    license: 'OFL-1.1',
  },
  {
    id: 'ibm-plex-sans',
    labelKey: 'fontIbmPlexSans',
    family: '"IBM Plex Sans", sans-serif',
    license: 'OFL-1.1',
  },
  {
    id: 'roboto',
    labelKey: 'fontRoboto',
    family: '"Roboto", sans-serif',
    license: 'Apache-2.0',
  },
]

export const DEFAULT_WATERMARK_FONT_ID = 'noto-sc'

export function getWatermarkFontById(id) {
  return WATERMARK_FONTS.find((f) => f.id === id) ?? WATERMARK_FONTS[0]
}
