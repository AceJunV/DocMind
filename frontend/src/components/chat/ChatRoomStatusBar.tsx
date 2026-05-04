import { Target, Zap } from 'lucide-react'
import type { ChatAgendaItem, ChatMessage, Agent, DiscussionMode, DiscussionState } from '@/types'

interface Props {
  messages: ChatMessage[]
  participants: Agent[]
  discussionMode?: DiscussionMode
  discussionState?: DiscussionState
  currentTopic?: ChatAgendaItem | null
  remainingTopics?: number
  isActive: boolean
}

const MODE_LABELS: Record<DiscussionMode, string> = {
  free: '自由讨论',
  moderated: '引导讨论',
  debate: '辩论模式',
}

const STATE_LABELS: Record<DiscussionState, string> = {
  idle: '待开始',
  kickoff: '开场中',
  discussing: '讨论中',
  summarizing: '收束中',
  closed: '已关闭',
}

export function ChatRoomStatusBar({
  messages,
  participants,
  discussionMode,
  discussionState,
  currentTopic,
  remainingTopics = 0,
  isActive,
}: Props) {
  const agentCount = participants.length
  const messageCount = messages.length

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {discussionMode ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 font-medium text-white shadow-sm dark:bg-gray-700 dark:text-gray-100">
          <Zap className="h-3 w-3" />
          {MODE_LABELS[discussionMode]}
        </span>
          ) : null}

          {currentTopic ? (
        <span className="inline-flex min-w-0 max-w-[min(58vw,760px)] items-center gap-1 rounded-full border border-primary-200 bg-white px-3 py-1 font-semibold text-primary-800 shadow-sm dark:border-primary-700 dark:bg-primary-950/70 dark:text-primary-100">
          <Target className="h-3 w-3 shrink-0 text-primary-600" />
          <span className="truncate">{currentTopic.text}</span>
        </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-gray-300">
          <span>{messageCount} 条</span>
          <span>·</span>
          <span>{agentCount} 位角色</span>
          {remainingTopics > 0 ? <span>· 剩余 {remainingTopics}</span> : null}

      {isActive ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {discussionState ? STATE_LABELS[discussionState] : '进行中'}
        </span>
          ) : discussionState ? (
            <span>{STATE_LABELS[discussionState]}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
