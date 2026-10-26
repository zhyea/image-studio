/**
 * 覆盖 useImageProcess 的 busy 生命周期 / 异常兜底 / 惰性文案 / 重入保护。
 * 通过 notify 注入通知实现，避免单测触发真实 ElMessage（会尝试渲染 DOM toast）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { useImageProcess } from '../src/composables/useImageProcess.js'

const originalConsoleError = console.error

function makeCtx() {
  const messages = []
  console.error = () => {}
  const { busy, run } = useImageProcess({
    notify: { error: (msg) => messages.push(['error', msg]) },
  })
  return {
    busy,
    run,
    messages,
    restore: () => {
      console.error = originalConsoleError
    },
  }
}

test('busy is true inside the task and false after success', async () => {
  const ctx = makeCtx()
  try {
    assert.equal(ctx.busy.value, false)
    const seen = []
    const ok = await ctx.run(async () => {
      seen.push(ctx.busy.value)
    })
    assert.equal(ok, true)
    assert.deepEqual(seen, [true], 'busy 在任务体内为 true')
    assert.equal(ctx.busy.value, false, '成功后 busy 复位')
  } finally {
    ctx.restore()
  }
})

test('busy always resets when the task throws (no permanent busy)', async () => {
  const ctx = makeCtx()
  try {
    const ok = await ctx.run(async () => {
      throw new Error('boom')
    })
    assert.equal(ok, false)
    assert.equal(ctx.busy.value, false, 'finally 保证 busy 复位')
    assert.deepEqual(ctx.messages, [], '未传 errorMsg 时不弹提示')
  } finally {
    ctx.restore()
  }
})

test('ElMessage.error uses the given message when task throws', async () => {
  const ctx = makeCtx()
  try {
    await ctx.run(
      async () => {
        throw new Error('x')
      },
      { errorMsg: '处理失败' },
    )
    assert.deepEqual(ctx.messages, [['error', '处理失败']])
  } finally {
    ctx.restore()
  }
})

test('errorMsg as function is resolved lazily at failure time', async () => {
  const ctx = makeCtx()
  try {
    let mode = 'fast'
    let reads = 0
    const ok = await ctx.run(
      async () => {
        mode = 'ai' // 任务执行期间改变，验证"出错时才求值"
        throw new Error('x')
      },
      {
        errorMsg: () => {
          reads += 1
          return mode === 'ai' ? 'AI 失败' : '处理失败'
        },
      },
    )
    assert.equal(ok, false)
    assert.equal(reads, 1, 'errorMsg 只求值一次')
    assert.deepEqual(ctx.messages, [['error', 'AI 失败']], '反映出错时刻的取值')
  } finally {
    ctx.restore()
  }
})

test('re-entrant call is ignored while busy and produces no message', async () => {
  const ctx = makeCtx()
  try {
    let release
    const gate = new Promise((r) => {
      release = r
    })
    let nestedResult = 'not-set'
    const outer = ctx.run(async () => {
      nestedResult = await ctx.run(async () => {
        throw new Error('should not run')
      })
      await gate
    })
    await new Promise((r) => setTimeout(r, 0))
    assert.equal(nestedResult, false, 'busy 期间的重入调用被拒绝')
    release()
    await outer
    assert.equal(ctx.busy.value, false)
    assert.deepEqual(ctx.messages, [], '被拒绝的任务未产生提示')
  } finally {
    ctx.restore()
  }
})

test('task returning early counts as success with no message', async () => {
  const ctx = makeCtx()
  try {
    const ok = await ctx.run(async () => {
      return // 模拟视图里的 `if (!canvas) return`
    })
    assert.equal(ok, true)
    assert.equal(ctx.busy.value, false)
    assert.deepEqual(ctx.messages, [])
  } finally {
    ctx.restore()
  }
})
