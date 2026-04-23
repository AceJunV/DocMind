import { useState, useMemo } from 'react'
import { Search, X, User, MessageCircle } from 'lucide-react'
import { AGENT_COLORS } from '@/stores/agentStore'
import type { ChatMessage, Agent } from '@/types'

interface Props {
  messages: ChatMessage[]
  participants: Agent[]
  onClose: () => void
  onJumpToMessage: (messageId: string) => void
}

export function ChatSearchPanel({ messages, participants, onClose, onJumpToMessage }: Props) {
  const [query, setQuery] = useState('')
  const [filterAgentId, setFilterAgentId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'user' | 'agent'>('all')

  const results = useMemo(() => {
    if (!query.trim() && !filterAgentId && filterType === 'all') return []
    return messages.filter((m) => {
      if (m.sender_id === 'system') return false
      if (filterType === 'user' && m.sender_type !== 'user') return false
      if (filterType === 'agent' && m.sender_type !== 'agent') return false
      if (filterAgentId && m.sender_id !== filterAgentId) return false
      if (query.trim() && !m.content.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [messages, query, filterAgentId, filterType])

  return (
    <div className="absolute inset-0 z-30 bg-white dark:bg-gray-800 flex flex-col rounded-xl">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索聊天记录..."
          className="flex-1 bg-transparent text-sm outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
          autoFocus
        />
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => setFilterType(filterType === 'all' ? 'agent' : filterType === 'agent' ? 'user' : 'all')}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border cursor-pointer transition-colors ${
            filterType !== 'all' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}
        >
          {filterType === 'all' ? <MessageCircle className="h-3 w-3" /> : <User className="h-3 w-3" />}
          {filterType === 'all' ? '全部' : filterType === 'agent' ? '角色' : '用户'}
        </button>
        <div className="flex gap-1 overflow-x-auto">
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterAgentId(filterAgentId === p.id ? null : p.id)}
              className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-1 text-xs border cursor-pointer transition-colors ${
                filterAgentId === p.id ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: AGENT_COLORS[p.color] + '40' }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {results.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            {query.trim() || filterAgentId || filterType !== 'all' ? '没有找到匹配的消息' : '输入关键词开始搜索'}
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-400 px-1">找到 {results.length} 条消息</div>
            {results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => { onJumpToMessage(msg.id); onClose() }}
                className="w-full text-left rounded-lg border border-gray-100 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer bg-transparent transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-medium" style={{ color: msg.sender_color ? AGENT_COLORS[msg.sender_color] : '#666' }}>
                    {msg.sender_name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(msg.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{msg.content}</p>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
