import type { Agent, ChatMessage } from '@/types'

export interface Collision {
  agentA: Agent
  agentB: Agent
  topic: string
  stanceA: string
  stanceB: string
  confidence: number
}

const OPPOSITION_KEYWORDS = [
  ['不同意', '但是', '然而', '相反', '反对', '不认为'],
  ['恰恰相反', '未必', '不见得', '值得商榷'],
]

export function detectCollisions(
  messages: ChatMessage[],
  participants: Agent[],
  windowSize = 5,
): Collision[] {
  const collisions: Collision[] = []
  const recent = messages.slice(-windowSize)

  const agentMessages = new Map<string, ChatMessage[]>()
  for (const msg of recent) {
    if (msg.sender_type !== 'agent' || msg.sender_id === 'system') continue
    const existing = agentMessages.get(msg.sender_id) || []
    existing.push(msg)
    agentMessages.set(msg.sender_id, existing)
  }

  const agentIds = Array.from(agentMessages.keys())
  for (let i = 0; i < agentIds.length; i++) {
    for (let j = i + 1; j < agentIds.length; j++) {
      const msgsA = agentMessages.get(agentIds[i])!
      const msgsB = agentMessages.get(agentIds[j])!

      const agentA = participants.find((p) => p.id === agentIds[i])
      const agentB = participants.find((p) => p.id === agentIds[j])
      if (!agentA || !agentB) continue

      for (const msgB of msgsB) {
        const hasOpposition = OPPOSITION_KEYWORDS.flat().some((kw) =>
          msgB.content.includes(kw)
        )
        const mentionsA = msgB.content.includes(agentA.name)

        if (hasOpposition && mentionsA) {
          const referencedMsgA = msgsA[msgsA.length - 1]
          if (!referencedMsgA) continue

          collisions.push({
            agentA,
            agentB,
            topic: extractTopic(referencedMsgA.content, msgB.content),
            stanceA: referencedMsgA.content.slice(0, 100),
            stanceB: msgB.content.slice(0, 100),
            confidence: hasOpposition && mentionsA ? 0.8 : 0.5,
          })
        }
      }
    }
  }

  return collisions
}

function extractTopic(contentA: string, contentB: string): string {
  const combined = contentA + ' ' + contentB
  const sentences = combined.split(/[。！？\n]/).filter(Boolean)
  return sentences[0]?.slice(0, 50) || '讨论焦点'
}
