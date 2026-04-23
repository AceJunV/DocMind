import { useMemo } from 'react'
import { MessageCircle, Users, Clock, Zap } from 'lucide-react'
import type { ChatMessage, Agent, DiscussionMode } from '@/types'

interface Props {
  messages: ChatMessage[]
  participants: Agent[]
  discussionMode?: DiscussionMode
  isActive: boolean
}

const MODE_LABELS: Record<DiscussionMode, string> = {
  free: '自由讨论',
  moderated: '引导讨论',
  debate: '辩论模式',
}

export function ChatRoomStatusBar({ messages, participants, discussionMode, isActive }: Props) {
  const stats = useMemo(() => {
    const agentMessages = messages.filter((m) => m.sender_type === 'agent' && m.sender_id !== 'system')
    const userMessages = messages.filter((m) => m.sender_type === 'user')
    const activeAgents = new Set(agentMessages.map((m) => m.sender_id)).size

    const lastMsg = messages[messages.length - 1]
    const lastActiveAgo = lastMsg
      ? Math.round((Date.now() - new Date(lastMsg.created_at).getTime()) / 1000)
      : null

    let lastActiveText = '无活动'
    if (lastActiveAgo !== null) {
      if (lastActiveAgo < 60) lastActiveText = '刚刚'
      else if (lastActiveAgo < 3600) lastActiveText = `${Math.floor(lastActiveAgo / 60)}分钟前`
      else lastActiveText = `${Math.floor(lastActiveAgo / 3600)}小时前`
    }

    return { agentMsgCount: agentMessages.length, userMsgCount: userMessages.length, activeAgents, lastActiveText }
  }, [messages])

  return (
    <div className="flex items-center gap-4 px-5 py-1.5 border-b border-gray-100 dark:border-gray-700 text-[11px] text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/30">
      {discussionMode && (
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {MODE_LABELS[discussionMode]}
        </span>
      )}
      <span className="flex items-center gap-1">
        <MessageCircle className="h-3 w-3" />
        {stats.agentMsgCount + stats.userMsgCount} 条消息
      </span>
      <span className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        {stats.activeAgents}/{participants.length} 位角色活跃
      </span>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {stats.lastActiveText}
      </span>
      {isActive && (
        <span className="ml-auto flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          进行中
        </span>
      )}
    </div>
  )
}
