import { useSettingsStore, resolveModelConfig, isModelConfigValid } from '@/stores/settingsStore'
import { getRetryDelayMs, sleepWithSignal } from '@/utils/retry'

export class LLMError extends Error {
  code: 'no_config' | 'invalid_config' | 'network' | 'api_error' | 'parse_error' | 'aborted'
  status?: number

  constructor(
    message: string,
    code: 'no_config' | 'invalid_config' | 'network' | 'api_error' | 'parse_error' | 'aborted',
    status?: number,
  ) {
    super(message)
    this.name = 'LLMError'
    this.code = code
    this.status = status
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface StreamCallbacks {
  onChunk: (text: string) => void
  onDone: (fullText: string) => void
  onError: (error: LLMError) => void
}

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504])
const MAX_REQUEST_ATTEMPTS = 3

function getConfig() {
  const config = useSettingsStore.getState().currentConfig
  if (!config || !isModelConfigValid(config)) {
    throw new LLMError('请先在设置页面配置有效的 API Key 和模型', 'no_config')
  }

  return resolveModelConfig(config)
}

async function readErrorDetail(response: Response) {
  try {
    const body = await response.json()
    return body.error?.message || JSON.stringify(body)
  } catch {
    return await response.text().catch(() => '')
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const config = getConfig()
  const url = `${config.baseUrl}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }

  let response: Response | null = null
  let lastStatus: number | undefined
  let lastDetail = ''

  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
        }),
        signal,
      })
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LLMError('请求已取消', 'aborted')
      }

      if (attempt >= MAX_REQUEST_ATTEMPTS) {
        throw new LLMError('网络连接失败，请检查网络和接口地址', 'network')
      }

      await sleepWithSignal(getRetryDelayMs(attempt), signal)
      continue
    }

    if (response.ok) {
      break
    }

    lastStatus = response.status
    lastDetail = await readErrorDetail(response)

    if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_REQUEST_ATTEMPTS) {
      await sleepWithSignal(
        getRetryDelayMs(attempt, response.status, response.headers.get('Retry-After')),
        signal,
      )
      continue
    }

    throw new LLMError(`API 返回错误 (${response.status}): ${lastDetail}`, 'api_error', response.status)
  }

  if (!response?.ok) {
    throw new LLMError(`API 返回错误 (${lastStatus || 'unknown'}): ${lastDetail}`, 'api_error', lastStatus)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new LLMError('无法读取响应流', 'parse_error')
  }

  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (!content) continue

          fullText += content
          callbacks.onChunk(content)
        } catch {
          // 忽略非 JSON 的流式片段
        }
      }
    }

    callbacks.onDone(fullText)
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      callbacks.onDone(fullText)
      return
    }

    const llmError = new LLMError('读取流式响应时出错', 'parse_error')
    callbacks.onError(llmError)
    throw llmError
  }
}

export async function testConnection(): Promise<{ ok: boolean; message: string; model?: string }> {
  try {
    const config = getConfig()
    const url = `${config.baseUrl}/chat/completions`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        ok: false,
        message: `API 返回 ${res.status}: ${(body as Record<string, unknown>).error || '未知错误'}`,
      }
    }

    const body = await res.json()
    return {
      ok: true,
      message: '连接成功！',
      model: body.model || config.model,
    }
  } catch (error) {
    if (error instanceof LLMError) {
      return { ok: false, message: error.message }
    }

    return { ok: false, message: '网络连接失败' }
  }
}
