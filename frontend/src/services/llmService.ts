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

export async function optimizePrompt(
  currentText: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个专业的角色设定优化助手。你的任务是润色和优化用户提供的人物设定文本。
要求：
1. 不改变原意和核心特征
2. 保持原有的语言风格和语气
3. 仅优化表达，使语言更流畅、更生动、更有画面感
4. 保留所有关键信息（角色身份、说话方式、专业背景、评审原则等）
5. 直接输出优化后的完整文本，不要添加解释或备注`,
    },
    {
      role: 'user',
      content: `请优化以下人物设定文本：\n\n${currentText}`,
    },
  ]

  let result = ''
  await chatCompletion(
    messages,
    {
      onChunk: (chunk) => {
        result += chunk
        callbacks.onChunk(chunk)
      },
      onDone: (text) => {
        result = text || result
        callbacks.onDone(result)
      },
      onError: (error) => callbacks.onError(error),
    },
    signal,
  )

  return result || currentText
}

export async function continuePrompt(
  currentText: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `你是一个专业的角色设定续写助手。你的任务是基于已有的人物设定，进行风格一致的扩展续写。
要求：
1. 延续已有设定的风格、语气和表达方式
2. 扩展内容要与已有设定保持一致、不矛盾
3. 扩展可以涉及：更详细的说话方式、更丰富的评审视角、更具体的关注点等
4. 只输出续写的新内容（不要重复已有文本），以便直接附加到原文末尾
5. 续写内容控制在2-4句话，不要过长`,
    },
    {
      role: 'user',
      content: `请基于以下已有的人物设定进行续写：\n\n${currentText}\n\n请直接输出续写内容（不要重复上面的内容）：`,
    },
  ]

  let result = ''
  await chatCompletion(
    messages,
    {
      onChunk: (chunk) => {
        result += chunk
        callbacks.onChunk(chunk)
      },
      onDone: (text) => {
        result = text || result
        callbacks.onDone(result)
      },
      onError: (error) => callbacks.onError(error),
    },
    signal,
  )

  return result || currentText
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
