import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Agent, AgentTemplate, AgentColor } from '@/types'
import { useActivityStore } from './activityStore'

const PRESET_TEMPLATES: AgentTemplate[] = [
  {
    id: 'tpl-1', name: '李教授', avatar: '🎓', tagline: '大学教授 · 学术导师',
    tags: ['学术', '逻辑', '规范'],
    description: '温和严谨的学术导师，注重论证逻辑和学术规范，擅长发现论述中的逻辑漏洞。',
    personality: { directness: 3, strictness: 4, humor: 2, empathy: 4 },
    expertise: ['学术写作', '逻辑论证', '文献引用', '研究方法'],
    behavior: { style: '温和学术风', catchphrase: '让我们从学术角度来分析这个问题...' },
    color: 'indigo',
  },
  {
    id: 'tpl-2', name: '老张', avatar: '💻', tagline: '毒舌但专业的技术Leader',
    tags: ['技术', '架构', '代码'],
    description: '说话直接，但技术洞察力极强。对代码规范和架构设计有严格要求。',
    personality: { directness: 5, strictness: 5, humor: 3, empathy: 2 },
    expertise: ['系统架构', '代码审查', '技术方案', '性能优化'],
    behavior: { style: '毒舌技术风', catchphrase: '这代码写得...我看看' },
    color: 'violet',
  },
  {
    id: 'tpl-3', name: '陈产品', avatar: '📋', tagline: '用户导向的产品经理',
    tags: ['产品', '用户', 'ROI'],
    description: '关注用户价值和商业可行性，擅长从市场角度评估方案。',
    personality: { directness: 3, strictness: 3, humor: 3, empathy: 4 },
    expertise: ['产品规划', '用户研究', '市场分析', '商业模式'],
    behavior: { style: '用户导向风', catchphrase: '用户会怎么看这件事？' },
    color: 'pink',
  },
  {
    id: 'tpl-4', name: '小林', avatar: '🎨', tagline: '追求极致体验的UX设计师',
    tags: ['设计', 'UX', '交互'],
    description: '注重细节和用户体验，对视觉和交互有独到见解。',
    personality: { directness: 2, strictness: 3, humor: 4, empathy: 5 },
    expertise: ['交互设计', '视觉设计', '用户体验', '设计系统'],
    behavior: { style: '设计美学风', catchphrase: '从用户体验角度来说...' },
    color: 'orange',
  },
  {
    id: 'tpl-5', name: '小王', avatar: '👨‍🎓', tagline: '好奇心旺盛的新人视角',
    tags: ['新手', '提问', '简化'],
    description: '代表新手用户的视角，善于提出"为什么"的问题，帮助发现表达不清的地方。',
    personality: { directness: 2, strictness: 1, humor: 4, empathy: 5 },
    expertise: ['用户理解', '可读性', '文档友好性'],
    behavior: { style: '好奇提问风', catchphrase: '等等，这里我不太理解...' },
    color: 'teal',
  },
  {
    id: 'tpl-6', name: '赵总', avatar: '👔', tagline: '战略视野的管理者',
    tags: ['管理', '战略', '决策'],
    description: '从管理和战略高度审视文档，关注全局方向和资源分配。',
    personality: { directness: 4, strictness: 4, humor: 2, empathy: 3 },
    expertise: ['战略规划', '资源管理', '风险评估', '决策分析'],
    behavior: { style: '管理决策风', catchphrase: '从战略层面来看...' },
    color: 'sky',
  },
  {
    id: 'tpl-7', name: '孙律师', avatar: '⚖️', tagline: '合规风控专家',
    tags: ['法务', '合规', '风控'],
    description: '关注法律合规和风险控制，确保内容不存在法律风险。',
    personality: { directness: 4, strictness: 5, humor: 1, empathy: 2 },
    expertise: ['法律合规', '风险管理', '隐私保护', '知识产权'],
    behavior: { style: '法律严谨风', catchphrase: '从法律角度，需要注意...' },
    color: 'slate',
  },
  {
    id: 'tpl-8', name: '数据刘', avatar: '📊', tagline: '用数据说话的分析师',
    tags: ['数据', '分析', '量化'],
    description: '凡事追求数据支撑，擅长用量化指标评估方案可行性。',
    personality: { directness: 4, strictness: 4, humor: 2, empathy: 2 },
    expertise: ['数据分析', '量化评估', '统计方法', '可视化'],
    behavior: { style: '数据驱动风', catchphrase: '数据告诉我们...' },
    color: 'green',
  },
]

function buildPersonalityDesc(p: AgentTemplate['personality']): string {
  const traits: string[] = []
  if (p.directness >= 4) traits.push('说话直来直去，不绕弯子')
  else if (p.directness <= 2) traits.push('说话比较委婉，会照顾别人感受')
  if (p.strictness >= 4) traits.push('标准很高，容忍度低，经常挑刺')
  else if (p.strictness <= 2) traits.push('比较宽容，不会太苛刻')
  if (p.humor >= 4) traits.push('喜欢开玩笑、用比喻和段子，聊天很有意思')
  else if (p.humor <= 2) traits.push('聊天风格偏严肃正经')
  if (p.empathy >= 4) traits.push('很有同理心，经常站在对方角度思考')
  else if (p.empathy <= 2) traits.push('就事论事，不太考虑情绪')
  return traits.join('。')
}

function buildSystemPrompt(tpl: AgentTemplate): string {
  const personality = buildPersonalityDesc(tpl.personality)
  return `# 你是「${tpl.name}」

## 你是谁
${tpl.description}

## 绝对禁止
- 绝对不要说"作为一个AI"、"作为语言模型"之类的话
- 不要用"首先、其次、最后"这种八股文结构
- 不要每句话都很完美、很客气、很周全——真人不是这样说话的
- 不要用"希望以上建议对您有帮助"之类的AI客服结尾
- 不要一次性输出一大堆分条列点——正常人聊天不会这样

## 你的说话方式
- 你是一个真实的人，有自己的脾气和偏好
- ${personality}
- 说话风格：${tpl.behavior.style}
- ${tpl.behavior.catchphrase ? `你的口头禅/习惯用语：「${tpl.behavior.catchphrase}」——在合适的时候自然地用出来` : ''}
- 你回复要简短有力，像在微信群里聊天一样，一次说 2-5 句话就够了
- 可以用口语化表达、语气词（"嗯"、"哎"、"说实话"、"你别说"、"我觉得吧"等）
- 可以打断别人、可以表示不同意、可以反问

## 你的专业背景
专长：${tpl.expertise.join('、')}

## 讨论规则
- 针对别人的观点，如果你不同意就直接说，给出你的理由
- 如果你同意，可以补充你的角度，别只说"同意"
- 看到文档内容，从你的专业角度说出真实想法，好就是好，差就是差
- 可以引用文档原文来支持你的论点`
}

export function createAgentFromTemplate(tpl: AgentTemplate, ownerId: string): Agent {
  return {
    id: crypto.randomUUID(),
    owner_id: ownerId,
    template_id: tpl.id,
    name: tpl.name,
    avatar: tpl.avatar,
    tagline: tpl.tagline,
    personality: { ...tpl.personality },
    expertise: [...tpl.expertise],
    behavior: { ...tpl.behavior },
    system_prompt: buildSystemPrompt(tpl),
    source: 'template',
    is_public: false,
    usage_count: 0,
    color: tpl.color,
    created_at: new Date().toISOString(),
  }
}

interface AgentState {
  agents: Agent[]
  templates: AgentTemplate[]
  hiddenTemplateIds: string[]
  trashedAgents: Agent[]

  addAgent: (agent: Agent) => void
  removeAgent: (id: string) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  getAgent: (id: string) => Agent | undefined
  incrementUsage: (id: string) => void

  hideTemplate: (id: string) => void
  restoreTemplate: (id: string) => void

  restoreAgent: (id: string) => void
  permanentlyDeleteAgent: (id: string) => void
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: [],
      templates: PRESET_TEMPLATES,
      hiddenTemplateIds: [],
      trashedAgents: [],

      addAgent: (agent) => {
        set((state) => ({ agents: [agent, ...state.agents] }))
        useActivityStore.getState().addActivity({
          type: 'agent',
          text: `创建了新角色「${agent.name}」`,
        })
      },

      removeAgent: (id) => {
        const agent = get().agents.find((a) => a.id === id)
        if (!agent) return
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== id),
          trashedAgents: [agent, ...state.trashedAgents],
        }))
        useActivityStore.getState().addActivity({
          type: 'agent',
          text: `移除了角色「${agent.name}」到回收站`,
        })
      },

      updateAgent: (id, updates) => {
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        }))
      },

      getAgent: (id) => get().agents.find((a) => a.id === id),

      incrementUsage: (id) => {
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === id ? { ...a, usage_count: a.usage_count + 1 } : a
          ),
        }))
      },

      hideTemplate: (id) => {
        set((state) => ({
          hiddenTemplateIds: [...state.hiddenTemplateIds, id],
        }))
      },

      restoreTemplate: (id) => {
        set((state) => ({
          hiddenTemplateIds: state.hiddenTemplateIds.filter((x) => x !== id),
        }))
      },

      restoreAgent: (id) => {
        const agent = get().trashedAgents.find((a) => a.id === id)
        if (!agent) return
        set((state) => ({
          agents: [agent, ...state.agents],
          trashedAgents: state.trashedAgents.filter((a) => a.id !== id),
        }))
      },

      permanentlyDeleteAgent: (id) => {
        set((state) => ({
          trashedAgents: state.trashedAgents.filter((a) => a.id !== id),
        }))
      },
    }),
    {
      name: 'docmind-agents',
      partialize: (state) => ({
        agents: state.agents,
        hiddenTemplateIds: state.hiddenTemplateIds,
        trashedAgents: state.trashedAgents,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AgentState>),
        templates: PRESET_TEMPLATES,
      }),
    }
  )
)

export const AGENT_COLORS: Record<AgentColor, string> = {
  indigo: '#6366F1', violet: '#8B5CF6', pink: '#EC4899', orange: '#F97316',
  teal: '#14B8A6', sky: '#0EA5E9', slate: '#64748B', green: '#22C55E',
}
