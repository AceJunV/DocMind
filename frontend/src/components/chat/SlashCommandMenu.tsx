import { useEffect, useRef } from 'react'
import { Vote, FileText, MessageSquareQuote, BookmarkPlus, Sparkles, Zap } from 'lucide-react'

export interface SlashCommand {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

const COMMANDS: SlashCommand[] = [
  { id: 'vote', label: '/vote', description: '发起投票', icon: <Vote className="h-4 w-4" /> },
  { id: 'summary', label: '/summary', description: '生成讨论总结', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'doc', label: '/doc', description: '发送已上传文档', icon: <FileText className="h-4 w-4" /> },
  { id: 'quote', label: '/quote', description: '引用回复消息', icon: <MessageSquareQuote className="h-4 w-4" /> },
  { id: 'collect', label: '/collect', description: '收藏最近消息', icon: <BookmarkPlus className="h-4 w-4" /> },
  { id: 'event', label: '/event', description: '触发角色事件', icon: <Zap className="h-4 w-4" /> },
]

interface Props {
  query: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
}

export function SlashCommandMenu({ query, onSelect, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const filtered = COMMANDS.filter(
    (cmd) => !query || cmd.id.includes(query.toLowerCase()) || cmd.label.includes(query.toLowerCase()),
  )

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  if (filtered.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20 dark:bg-gray-800 dark:border-gray-700"
    >
      <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 uppercase tracking-wider">斜杠命令</div>
      {filtered.map((cmd) => (
        <button
          key={cmd.id}
          onClick={() => onSelect(cmd)}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer border-0 bg-transparent transition-colors"
        >
          <span className="text-gray-400 dark:text-gray-500">{cmd.icon}</span>
          <div className="text-left">
            <span className="font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">{cmd.label}</span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{cmd.description}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
