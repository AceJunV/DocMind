import { AGENT_COLORS } from '@/stores/agentStore'
import type { Agent } from '@/types'

interface TypingIndicatorProps {
  agents: Agent[]
}

export function TypingIndicator({ agents }: TypingIndicatorProps) {
  if (agents.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex -space-x-1.5">
        {agents.slice(0, 3).map((agent) => (
          <div
            key={agent.id}
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs ring-2 ring-white"
            style={{ backgroundColor: `${AGENT_COLORS[agent.color]}20` }}
            title={agent.name}
          >
            {agent.avatar || agent.name[0]}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">
          {agents.length === 1
            ? `${agents[0].name} 正在输入`
            : `${agents.map((a) => a.name).join('、')} 正在输入`}
        </span>
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 w-1 rounded-full bg-gray-400 animate-pulse-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
