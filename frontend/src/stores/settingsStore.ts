import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModelConfig, SavedModelProfile, ProviderMode } from '@/types'
import { createId } from '@/utils/id'

const DEFAULT_CONFIG: ModelConfig = {
  providerMode: 'official',
  model: '',
  apiKey: '',
  baseUrl: '',
  localEndpoint: '',
  maxConcurrentReviews: 1,
}

const OFFICIAL_BASE_URLS: Record<string, string> = {
  // OpenAI
  'openai': 'https://api.openai.com/v1',
  'gpt-': 'https://api.openai.com/v1',
  'o1': 'https://api.openai.com/v1',
  'o3': 'https://api.openai.com/v1',
  'o4': 'https://api.openai.com/v1',
  // Anthropic
  'claude': 'https://api.anthropic.com/v1',
  // Google Gemini
  'gemini': 'https://generativelanguage.googleapis.com/v1beta',
  // DeepSeek
  'deepseek': 'https://api.deepseek.com/v1',
  // Alibaba / Qwen
  'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'qwq': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'qvq': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  // Zhipu / GLM
  'glm': 'https://open.bigmodel.cn/api/paas/v4',
  // Moonshot / Kimi
  'kimi': 'https://api.moonshot.cn/v1',
  'moonshot': 'https://api.moonshot.cn/v1',
  // xAI / Grok
  'grok': 'https://api.x.ai/v1',
  // Baidu / ERNIE
  'ernie': 'https://qianfan.baidubce.com/v2',
  // ByteDance / Doubao
  'doubao': 'https://ark.cn-beijing.volces.com/api/v3',
  // MiniMax
  'minimax': 'https://api.minimax.chat/v1',
  // Mistral
  'mistral': 'https://api.mistral.ai/v1',
  'pixtral': 'https://api.mistral.ai/v1',
  'magistral': 'https://api.mistral.ai/v1',
  'voxtral': 'https://api.mistral.ai/v1',
  'codestral': 'https://api.mistral.ai/v1',
  'devstral': 'https://api.mistral.ai/v1',
}

export function resolveOfficialBaseUrl(model: string): string | null {
  const lower = model.toLowerCase()
  for (const [prefix, url] of Object.entries(OFFICIAL_BASE_URLS)) {
    if (lower.startsWith(prefix)) return url
  }
  return null
}

export function resolveModelConfig(config: Partial<ModelConfig>): ModelConfig {
  const resolved = { ...DEFAULT_CONFIG, ...config }
  if (resolved.providerMode === 'official' && resolved.model) {
    const url = resolveOfficialBaseUrl(resolved.model)
    if (url) resolved.baseUrl = url
  }
  if (resolved.providerMode === 'local' && resolved.localEndpoint) {
    resolved.baseUrl = resolved.localEndpoint
  }
  return resolved
}

export function isModelConfigValid(config: Partial<ModelConfig> | undefined): boolean {
  if (!config) return false
  const resolved = resolveModelConfig(config)
  return Boolean(resolved.model?.trim() && resolved.apiKey?.trim() && resolved.baseUrl?.trim())
}

interface SettingsState {
  profiles: SavedModelProfile[]
  activeProfileId: string | null
  currentConfig: ModelConfig

  addProfile: (name: string, config: ModelConfig) => SavedModelProfile
  updateProfile: (id: string, name: string, config: ModelConfig) => void
  deleteProfile: (id: string) => void
  applyProfile: (id: string) => void
  setCurrentConfig: (config: ModelConfig) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      currentConfig: DEFAULT_CONFIG,

      addProfile: (name, config) => {
        const profile: SavedModelProfile = {
          id: createId(),
          name,
          config: resolveModelConfig(config),
          savedAt: new Date().toISOString(),
        }
        set((state) => ({ profiles: [...state.profiles, profile] }))
        return profile
      },

      updateProfile: (id, name, config) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, name, config: resolveModelConfig(config), savedAt: new Date().toISOString() } : p
          ),
        }))
        const { activeProfileId } = get()
        if (activeProfileId === id) {
          set({ currentConfig: resolveModelConfig(config) })
        }
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }))
      },

      applyProfile: (id) => {
        const profile = get().profiles.find((p) => p.id === id)
        if (profile) {
          set({ activeProfileId: id, currentConfig: resolveModelConfig(profile.config) })
        }
      },

      setCurrentConfig: (config) => {
        set({ currentConfig: resolveModelConfig(config) })
      },
    }),
    {
      name: 'docmind-settings',
    }
  )
)

export const PROVIDER_MODE_OPTIONS: { value: ProviderMode; label: string }[] = [
  { value: 'official', label: '官方模式' },
  { value: 'third-party', label: '第三方兼容' },
  { value: 'local', label: '本地模式' },
]

export interface ModelRegistryEntry {
  id: string
  displayName: string
  vendor: string
  capability: 'text-only' | 'vision' | 'multimodal'
}

export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  // ── OpenAI ──
  { id: 'gpt-5.2', displayName: 'GPT-5.2', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-5.1', displayName: 'GPT-5.1', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-5', displayName: 'GPT-5', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-5-mini', displayName: 'GPT-5 Mini', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-5-nano', displayName: 'GPT-5 Nano', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-4.1', displayName: 'GPT-4.1', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-4.1-nano', displayName: 'GPT-4.1 Nano', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-4o', displayName: 'GPT-4o', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'o3', displayName: 'o3', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'o4-mini', displayName: 'o4-mini', vendor: 'OpenAI', capability: 'multimodal' },
  // ── Anthropic ──
  { id: 'claude-opus-4-7', displayName: 'Claude Opus 4.7', vendor: 'Anthropic', capability: 'multimodal' },
  { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', vendor: 'Anthropic', capability: 'multimodal' },
  { id: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5', vendor: 'Anthropic', capability: 'multimodal' },
  // ── Google Gemini ──
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', vendor: 'Google', capability: 'multimodal' },
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', vendor: 'Google', capability: 'multimodal' },
  { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', vendor: 'Google', capability: 'multimodal' },
  // ── DeepSeek ──
  { id: 'deepseek-chat', displayName: 'DeepSeek Chat (V3.2)', vendor: 'DeepSeek', capability: 'text-only' },
  { id: 'deepseek-reasoner', displayName: 'DeepSeek Reasoner (R1)', vendor: 'DeepSeek', capability: 'text-only' },
  // ── Alibaba / Qwen ──
  { id: 'qwen3-max', displayName: 'Qwen3 Max', vendor: '阿里云', capability: 'text-only' },
  { id: 'qwen-plus', displayName: 'Qwen Plus', vendor: '阿里云', capability: 'text-only' },
  { id: 'qwen-flash', displayName: 'Qwen Flash', vendor: '阿里云', capability: 'text-only' },
  { id: 'qwen-turbo', displayName: 'Qwen Turbo', vendor: '阿里云', capability: 'text-only' },
  { id: 'qwq-plus', displayName: 'QwQ Plus', vendor: '阿里云', capability: 'text-only' },
  { id: 'qwen3-vl-plus', displayName: 'Qwen3 VL Plus', vendor: '阿里云', capability: 'vision' },
  { id: 'qwen3-vl-flash', displayName: 'Qwen3 VL Flash', vendor: '阿里云', capability: 'vision' },
  { id: 'qvq-max', displayName: 'QVQ Max', vendor: '阿里云', capability: 'vision' },
  // ── Zhipu / GLM ──
  { id: 'GLM-4-Plus', displayName: 'GLM-4 Plus', vendor: '智谱', capability: 'text-only' },
  { id: 'GLM-4-Air', displayName: 'GLM-4 Air', vendor: '智谱', capability: 'text-only' },
  { id: 'GLM-4-Long', displayName: 'GLM-4 Long', vendor: '智谱', capability: 'text-only' },
  { id: 'GLM-4-FlashX', displayName: 'GLM-4 FlashX', vendor: '智谱', capability: 'text-only' },
  { id: 'GLM-4-Flash', displayName: 'GLM-4 Flash', vendor: '智谱', capability: 'text-only' },
  { id: 'GLM-Z1-Air', displayName: 'GLM-Z1 Air', vendor: '智谱', capability: 'text-only' },
  { id: 'GLM-Z1-Flash', displayName: 'GLM-Z1 Flash', vendor: '智谱', capability: 'text-only' },
  { id: 'GLM-4V-Plus', displayName: 'GLM-4V Plus', vendor: '智谱', capability: 'vision' },
  { id: 'GLM-4V-Flash', displayName: 'GLM-4V Flash', vendor: '智谱', capability: 'vision' },
  // ── Moonshot / Kimi ──
  { id: 'kimi-k2.5', displayName: 'Kimi K2.5', vendor: 'Moonshot', capability: 'multimodal' },
  { id: 'kimi-k2-turbo-preview', displayName: 'Kimi K2 Turbo', vendor: 'Moonshot', capability: 'text-only' },
  { id: 'kimi-k2-thinking', displayName: 'Kimi K2 Thinking', vendor: 'Moonshot', capability: 'text-only' },
  { id: 'moonshot-v1-128k', displayName: 'Moonshot v1 128K', vendor: 'Moonshot', capability: 'text-only' },
  { id: 'moonshot-v1-8k-vision-preview', displayName: 'Moonshot v1 Vision', vendor: 'Moonshot', capability: 'vision' },
  // ── xAI / Grok ──
  { id: 'grok-4', displayName: 'Grok 4', vendor: 'xAI', capability: 'multimodal' },
  { id: 'grok-4.20', displayName: 'Grok 4.20', vendor: 'xAI', capability: 'multimodal' },
  { id: 'grok-3', displayName: 'Grok 3', vendor: 'xAI', capability: 'multimodal' },
  { id: 'grok-3-mini', displayName: 'Grok 3 Mini', vendor: 'xAI', capability: 'text-only' },
  // ── Baidu / ERNIE ──
  { id: 'ernie-4.5-8k', displayName: 'ERNIE 4.5', vendor: '百度', capability: 'multimodal' },
  { id: 'ernie-4.0-8k', displayName: 'ERNIE 4.0', vendor: '百度', capability: 'text-only' },
  { id: 'ernie-speed-128k', displayName: 'ERNIE Speed 128K', vendor: '百度', capability: 'text-only' },
  { id: 'ernie-lite-8k', displayName: 'ERNIE Lite', vendor: '百度', capability: 'text-only' },
  // ── ByteDance / Doubao ──
  { id: 'doubao-1.5-pro-256k', displayName: 'Doubao 1.5 Pro 256K', vendor: '字节跳动', capability: 'text-only' },
  { id: 'doubao-1.5-pro-32k', displayName: 'Doubao 1.5 Pro 32K', vendor: '字节跳动', capability: 'text-only' },
  { id: 'doubao-1.5-lite-32k', displayName: 'Doubao 1.5 Lite 32K', vendor: '字节跳动', capability: 'text-only' },
  { id: 'doubao-1.5-thinking-pro-32k', displayName: 'Doubao 1.5 Thinking', vendor: '字节跳动', capability: 'text-only' },
  // ── MiniMax ──
  { id: 'MiniMax-M2.7', displayName: 'MiniMax M2.7', vendor: 'MiniMax', capability: 'text-only' },
  { id: 'MiniMax-M2.5', displayName: 'MiniMax M2.5', vendor: 'MiniMax', capability: 'text-only' },
  { id: 'MiniMax-M1', displayName: 'MiniMax M1', vendor: 'MiniMax', capability: 'text-only' },
  { id: 'MiniMax-VL-01', displayName: 'MiniMax VL', vendor: 'MiniMax', capability: 'vision' },
  // ── Mistral ──
  { id: 'mistral-medium-2508', displayName: 'Mistral Medium', vendor: 'Mistral', capability: 'text-only' },
  { id: 'mistral-large-2411', displayName: 'Mistral Large', vendor: 'Mistral', capability: 'text-only' },
  { id: 'mistral-small-2407', displayName: 'Mistral Small', vendor: 'Mistral', capability: 'text-only' },
  { id: 'magistral-medium-2507', displayName: 'Magistral Medium', vendor: 'Mistral', capability: 'text-only' },
  { id: 'codestral-2508', displayName: 'Codestral', vendor: 'Mistral', capability: 'text-only' },
  { id: 'pixtral-large-2411', displayName: 'Pixtral Large', vendor: 'Mistral', capability: 'vision' },
  { id: 'pixtral-12b-2409', displayName: 'Pixtral 12B', vendor: 'Mistral', capability: 'vision' },
]
