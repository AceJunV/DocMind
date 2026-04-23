import type { Agent, ChatMessage, RoleEvent, RoleEventType } from '@/types'

interface TriggerRule {
  type: RoleEventType
  baseProbability: number
  condition: (messages: ChatMessage[], agent: Agent) => boolean
  generateContent: (agent: Agent, context: string) => string
}

const TRIGGER_RULES: TriggerRule[] = [
  {
    type: 'challenge',
    baseProbability: 0.15,
    condition: (messages, agent) => {
      const recent = messages.slice(-3)
      return recent.some((m) =>
        m.sender_type === 'agent' &&
        m.sender_id !== agent.id &&
        m.content.length > 80
      )
    },
    generateContent: (agent) =>
      `${agent.name} 对此持不同看法，想要提出质疑。`,
  },
  {
    type: 'support',
    baseProbability: 0.2,
    condition: (messages, agent) => {
      const recent = messages.slice(-3)
      return recent.some((m) =>
        m.sender_type === 'agent' &&
        m.sender_id !== agent.id
      )
    },
    generateContent: (agent) =>
      `${agent.name} 表示赞同，并想补充自己的观点。`,
  },
  {
    type: 'question',
    baseProbability: 0.12,
    condition: (messages) => {
      const last = messages[messages.length - 1]
      return !!last && last.content.length > 50
    },
    generateContent: (agent) =>
      `${agent.name} 对上述讨论产生了疑问。`,
  },
  {
    type: 'tangent',
    baseProbability: 0.08,
    condition: (messages) => messages.length > 10,
    generateContent: (agent) =>
      `${agent.name} 想到了一个相关但不同角度的话题。`,
  },
  {
    type: 'summarize',
    baseProbability: 0.1,
    condition: (messages) => {
      const agentMsgs = messages.filter((m) => m.sender_type === 'agent')
      return agentMsgs.length > 8 && agentMsgs.length % 5 === 0
    },
    generateContent: (agent) =>
      `${agent.name} 觉得可以阶段性总结一下讨论要点。`,
  },
  {
    type: 'escalate',
    baseProbability: 0.06,
    condition: (messages) => {
      const recent = messages.slice(-5)
      const uniqueSenders = new Set(recent.map((m) => m.sender_id))
      return uniqueSenders.size >= 3
    },
    generateContent: (agent) =>
      `${agent.name} 认为当前的分歧值得更深入地讨论。`,
  },
]

export function evaluateTriggers(
  messages: ChatMessage[],
  agent: Agent,
): RoleEvent[] {
  const events: RoleEvent[] = []

  for (const rule of TRIGGER_RULES) {
    if (!rule.condition(messages, agent)) continue

    const roll = Math.random()
    if (roll > rule.baseProbability) continue

    const lastOtherMsg = [...messages]
      .reverse()
      .find((m) => m.sender_type === 'agent' && m.sender_id !== agent.id)

    events.push({
      type: rule.type,
      triggeredBy: agent.id,
      targetAgentId: lastOtherMsg?.sender_id,
      content: rule.generateContent(agent, lastOtherMsg?.content || ''),
      probability: rule.baseProbability,
    })
  }

  return events
}

export function getEventPromptSuffix(event: RoleEvent): string {
  switch (event.type) {
    case 'challenge':
      return '请对最近的观点提出质疑或不同看法，给出你的理由。'
    case 'support':
      return '请对最近的观点表示支持，并补充你的专业见解。'
    case 'question':
      return '请针对最近的讨论提出一个深入的问题。'
    case 'tangent':
      return '请从一个相关但不同的角度来看这个问题。'
    case 'summarize':
      return '请总结一下目前讨论的要点和各方观点。'
    case 'escalate':
      return '请指出当前分歧的核心，并建议如何更深入地讨论。'
  }
}
