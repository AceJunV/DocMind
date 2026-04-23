export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created_at: string
}

export interface Document {
  id: string
  owner_id: string
  title: string
  file_name: string
  file_type: 'pdf' | 'docx' | 'md' | 'txt'
  file_size: number
  raw_content?: string
  structured_content?: Record<string, unknown>
  keywords?: string[]
  summary?: string
  word_count?: number
  teaching_plan?: TeachingPlanFields
  status: 'uploading' | 'parsing' | 'ready' | 'error'
  review_count: number
  created_at: string
  updated_at?: string
}

export type AgentColor = 'indigo' | 'violet' | 'pink' | 'orange' | 'teal' | 'sky' | 'slate' | 'green' | 'rose' | 'amber' | 'emerald' | 'cyan'

export type TeachingDimension = '课程设计' | '知识链' | '教学目标' | '课程重点' | '课程难点' | '学习梯度'

export const TEACHING_DIMENSIONS: TeachingDimension[] = ['课程设计', '知识链', '教学目标', '课程重点', '课程难点', '学习梯度']

export interface TeachingPlanFields {
  subject?: string
  grade?: string
  topic?: string
  duration?: string
  objectives?: {
    knowledge?: string
    process?: string
    emotion?: string
  }
  keyPoints?: string[]
  difficulties?: string[]
  teachingProcess?: {
    stage: string
    content: string
    duration?: string
  }[]
  boardDesign?: string
  reflection?: string
}

export interface AgentPersonality {
  directness: number
  strictness: number
  humor: number
  empathy: number
}

export interface Agent {
  id: string
  owner_id: string
  template_id?: string
  name: string
  avatar?: string
  tagline: string
  personality: AgentPersonality
  expertise: string[]
  behavior: {
    style: string
    catchphrase?: string
  }
  system_prompt: string
  source: 'custom' | 'template' | 'community'
  is_public: boolean
  usage_count: number
  color: AgentColor
  category?: AgentCategory
  focusDimension?: TeachingDimension
  creation_history?: { role: 'ai' | 'user'; content: string }[]
  last_used_at?: string
  created_at: string
}

export type AgentCategory = 'teacher' | 'student' | 'parent'

export interface AgentTemplate {
  id: string
  name: string
  avatar?: string
  tagline: string
  tags: string[]
  description: string
  category: AgentCategory
  focusDimension?: TeachingDimension
  personality: AgentPersonality
  expertise: string[]
  behavior: {
    style: string
    catchphrase?: string
  }
  color: AgentColor
}

export interface Review {
  id: string
  document_id: string
  owner_id: string
  overall_score?: number
  agent_reviews?: AgentReview[]
  summary?: ReviewSummary
  status: 'in_progress' | 'completed'
  created_at: string
  document?: Document
  agents?: Agent[]
}

export interface AgentReview {
  agent_id: string
  agent_name: string
  agent_color: AgentColor
  score: number
  opinion: string
  status?: 'completed' | 'failed'
  error_message?: string
  dimensions: { name: string; score: number; comment?: string; evidence?: string }[]
  suggestions: Suggestion[]
  highlights?: string[]
}

export interface Suggestion {
  id: string
  content: string
  priority: 'high' | 'medium' | 'low'
  adopted: boolean
  source_agent: string
  evidence?: string
  expected_effect?: string
}

export interface ReviewSummary {
  consensus: string[]
  controversies: Controversy[]
  top_suggestions: Suggestion[]
}

export interface Controversy {
  topic: string
  opinions: { agent_name: string; agent_color: AgentColor; stance: string }[]
}

export interface ChatRoom {
  id: string
  document_id: string
  review_id?: string
  owner_id: string
  topic: string
  status: 'active' | 'closed'
  participants: Agent[]
  created_at: string
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_type: 'user' | 'agent'
  sender_id: string
  sender_name: string
  sender_color?: AgentColor
  content: string
  quotes?: { text: string; section: string }[]
  reply_to?: string
  target_agent_id?: string
  created_at: string
}

export type ProviderMode = 'official' | 'third-party' | 'local'

export interface ModelConfig {
  providerMode: ProviderMode
  model: string
  apiKey: string
  baseUrl: string
  localEndpoint: string
  maxConcurrentReviews?: number
}

export interface SavedModelProfile {
  id: string
  name: string
  config: ModelConfig
  savedAt: string
}
