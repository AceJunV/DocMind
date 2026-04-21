import { useSettingsStore, resolveModelConfig, isModelConfigValid } from '@/stores/settingsStore'

export class LLMError extends Error {
  code: 'no_config' | 'invalid_config' | 'network' | 'api_error' | 'parse_error' | 'aborted'
  status?: number

  constructor(
    message: string,
    code: 'no_config' | 'invalid_config' | 'network' | 'api_error' | 'parse_error' | 'aborted',
    status?: number
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

function getConfig() {
  const config = useSettingsStore.getState().currentConfig
  if (!config || !isModelConfigValid(config)) {
    throw new LLMError(
      '请先在设置页面配置有效的 API Key 和模型',
      'no_config'
    )
  }
  return resolveModelConfig(config)
}

export async function chatCompletion(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const config = getConfig()

  const url = `${config.baseUrl}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  }

  let response: Response
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
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new LLMError('请求已取消', 'aborted')
    }
    throw new LLMError('网络连接失败，请检查网络和接口地址', 'network')
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body.error?.message || JSON.stringify(body)
    } catch {
      detail = await response.text().catch(() => '')
    }
    throw new LLMError(
      `API 返回错误 (${response.status}): ${detail}`,
      'api_error',
      response.status
    )
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
          if (content) {
            fullText += content
            callbacks.onChunk(content)
          }
        } catch {
          // skip malformed JSON chunks
        }
      }
    }
    callbacks.onDone(fullText)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      callbacks.onDone(fullText)
      return
    }
    throw new LLMError('读取流式响应时出错', 'parse_error')
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
        'Authorization': `Bearer ${config.apiKey}`,
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
  } catch (err) {
    if (err instanceof LLMError) return { ok: false, message: err.message }
    return { ok: false, message: '网络连接失败' }
  }
}
