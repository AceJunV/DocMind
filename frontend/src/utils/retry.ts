import { LLMError } from '@/services/llmService'

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504])

function parseRetryAfter(headerValue: string | null) {
  if (!headerValue) return null

  const seconds = Number(headerValue)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const retryAt = Date.parse(headerValue)
  if (Number.isNaN(retryAt)) return null

  return Math.max(retryAt - Date.now(), 0)
}

export function isRetryableLlmError(error: unknown) {
  if (!(error instanceof LLMError)) return false
  if (error.code === 'network') return true
  return typeof error.status === 'number' && RETRYABLE_STATUS_CODES.has(error.status)
}

export function getRetryDelayMs(attempt: number, status?: number, retryAfterHeader?: string | null) {
  const retryAfter = parseRetryAfter(retryAfterHeader ?? null)
  if (retryAfter != null) {
    return retryAfter
  }

  const baseDelay = status === 429 ? 1500 : 800
  return Math.min(baseDelay * 2 ** Math.max(0, attempt - 1), 6000)
}

export async function sleepWithSignal(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      resolve()
    }, ms)

    const handleAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const cleanup = () => {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', handleAbort)
    }

    if (signal?.aborted) {
      handleAbort()
      return
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}
