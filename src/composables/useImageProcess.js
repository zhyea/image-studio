/**
 * 评审 🟡 #1：统一图像处理视图的 busy + try/catch/finally + 错误反馈样板，
 * 消除「忘记 finally → busy 永久挂起」这一类缺陷（此前 allowTaint / async 事故的根因）。
 *
 * 用法：
 *   const { busy, run } = useImageProcess()
 *   await run(async () => { ...原 try 体内的逻辑... }, { errorMsg: t('msg.processFail') })
 *
 * 注意：预先的前置校验（如未选图）仍放在视图侧的 run 之前，
 * 因为各页面的警告文案与校验条件不同，不宜强行统一。
 */
import { ref } from 'vue'
// 扩展名不可省：本模块被 tests/useImageProcess.test.mjs 用 node --test 直接导入，
// Node 的 ESM 解析器不做扩展名补全（Vite 会，Node 不会）。
import { toast } from '../utils/toast.js'

/**
 * @param {{ notify?: { error: (msg: string) => void } }} [opts]
 *        可注入通知实现，便于单测；默认用 utils/toast（零依赖，不引入 element-plus）。
 */
export function useImageProcess(opts = {}) {
  const notify = opts.notify ?? toast
  const busy = ref(false)

  /**
   * 执行处理任务：自动管理 busy 态、捕获异常、console.error 并弹错误提示，
   * 且**无论成功失败都保证 finally 复位 busy**。
   * @param {() => Promise<void>} task 处理任务；内部提前 return 视为正常结束
   * @param {{ errorMsg?: string | (() => string) }} [opts] 失败提示文案；
   *        支持传函数以在**出错时**惰性求值（保持与「catch 内才读状态」等价的语义，
   *        例如 UpscaleView 依赖出错时刻的 mode 决定文案）
   * @returns {Promise<boolean>} 是否成功；异常或已有任务在跑时为 false
   */
  async function run(task, opts = {}) {
    if (busy.value) return false
    busy.value = true
    try {
      await task()
      return true
    } catch (e) {
      console.error(e)
      if (opts.errorMsg) {
        notify.error(typeof opts.errorMsg === 'function' ? opts.errorMsg() : opts.errorMsg)
      }
      return false
    } finally {
      busy.value = false
    }
  }

  return { busy, run }
}
