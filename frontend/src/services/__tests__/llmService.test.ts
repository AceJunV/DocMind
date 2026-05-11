import { describe, expect, it } from 'vitest'
import { buildChatCompletionsUrl, getLlmErrorUserMessage } from '../llmService'

describe('getLlmErrorUserMessage', () => {
  it('distinguishes network timeouts, quota limits, and parse errors', () => {
    expect(getLlmErrorUserMessage('network')).toContain('请求超时')
    expect(getLlmErrorUserMessage('api_error', 429)).toContain('额度')
    expect(getLlmErrorUserMessage('parse_error')).toContain('返回格式异常')
  })

  it('keeps provider detail for actionable api errors', () => {
    const message = getLlmErrorUserMessage('api_error', 401, 'invalid key')

    expect(message).toContain('鉴权失败')
    expect(message).toContain('invalid key')
  })
})

describe('buildChatCompletionsUrl', () => {
  it('adds v1 for bare OpenAI-compatible relay domains', () => {
    expect(buildChatCompletionsUrl('https://api.aipaibox.com')).toBe('https://api.aipaibox.com/v1/chat/completions')
    expect(buildChatCompletionsUrl('https://api.aipaibox.com/')).toBe('https://api.aipaibox.com/v1/chat/completions')
  })

  it('keeps explicit API versions and full chat completion endpoints', () => {
    expect(buildChatCompletionsUrl('https://api.aipaibox.com/v1')).toBe('https://api.aipaibox.com/v1/chat/completions')
    expect(buildChatCompletionsUrl('https://api.aipaibox.com/v1/chat/completions')).toBe('https://api.aipaibox.com/v1/chat/completions')
  })
})
