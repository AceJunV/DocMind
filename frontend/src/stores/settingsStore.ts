import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModelConfig, SavedModelProfile, ProviderMode } from '@/types'

const DEFAULT_CONFIG: ModelConfig = {
  providerMode: 'official',
  model: '',
  apiKey: '',
  baseUrl: '',
  localEndpoint: '',
}

const OFFICIAL_BASE_URLS: Record<string, string> = {
  'openai': 'https://api.openai.com/v1',
  'gpt-': 'https://api.openai.com/v1',
  'o1': 'https://api.openai.com/v1',
  'o3': 'https://api.openai.com/v1',
  'o4': 'https://api.openai.com/v1',
  'deepseek': 'https://api.deepseek.com/v1',
  'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'glm': 'https://open.bigmodel.cn/api/paas/v4',
  'claude': 'https://api.anthropic.com/v1',
  'kimi': 'https://api.moonshot.cn/v1',
  'moonshot': 'https://api.moonshot.cn/v1',
  'grok': 'https://api.x.ai/v1',
  'mistral': 'https://api.mistral.ai/v1',
  'gemini': 'https://generativelanguage.googleapis.com/v1beta',
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
          id: crypto.randomUUID(),
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
  { id: 'gpt-4o', displayName: 'GPT-4o', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', vendor: 'OpenAI', capability: 'vision' },
  { id: 'o4-mini', displayName: 'o4-mini', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'o3', displayName: 'o3', vendor: 'OpenAI', capability: 'multimodal' },
  { id: 'deepseek-chat', displayName: 'DeepSeek Chat', vendor: 'DeepSeek', capability: 'text-only' },
  { id: 'deepseek-reasoner', displayName: 'DeepSeek Reasoner', vendor: 'DeepSeek', capability: 'text-only' },
  { id: 'qwen-max', displayName: 'Qwen Max', vendor: '阿里云', capability: 'text-only' },
  { id: 'qwen-plus', displayName: 'Qwen Plus', vendor: '阿里云', capability: 'text-only' },
  { id: 'qwen-vl-max', displayName: 'Qwen VL Max', vendor: '阿里云', capability: 'vision' },
  { id: 'glm-4', displayName: 'GLM-4', vendor: '智谱', capability: 'text-only' },
  { id: 'glm-4v', displayName: 'GLM-4V', vendor: '智谱', capability: 'vision' },
  { id: 'claude-4-sonnet', displayName: 'Claude 4 Sonnet', vendor: 'Anthropic', capability: 'multimodal' },
  { id: 'claude-4-opus', displayName: 'Claude 4 Opus', vendor: 'Anthropic', capability: 'multimodal' },
  { id: 'kimi', displayName: 'Kimi', vendor: 'Moonshot', capability: 'text-only' },
  { id: 'moonshot-v1-128k', displayName: 'Moonshot v1 128K', vendor: 'Moonshot', capability: 'text-only' },
  { id: 'grok-2', displayName: 'Grok 2', vendor: 'xAI', capability: 'text-only' },
  { id: 'mistral-large', displayName: 'Mistral Large', vendor: 'Mistral', capability: 'text-only' },
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', vendor: 'Google', capability: 'multimodal' },
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', vendor: 'Google', capability: 'multimodal' },
]
