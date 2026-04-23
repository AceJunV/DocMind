import { Vote, FileText, MessageSquareQuote, BookmarkPlus, Sparkles } from 'lucide-react'

interface Props {
  onQuote: () => void
  onDoc: () => void
  onVote: () => void
  onSummary: () => void
  onBookmark: () => void
  disabled?: boolean
}

export function ChatToolbar({ onQuote, onDoc, onVote, onSummary, onBookmark, disabled }: Props) {
  const buttons = [
    { icon: <MessageSquareQuote className="h-3.5 w-3.5" />, label: '引用', onClick: onQuote },
    { icon: <FileText className="h-3.5 w-3.5" />, label: '文档', onClick: onDoc },
    { icon: <Vote className="h-3.5 w-3.5" />, label: '投票', onClick: onVote },
    { icon: <Sparkles className="h-3.5 w-3.5" />, label: '总结', onClick: onSummary },
    { icon: <BookmarkPlus className="h-3.5 w-3.5" />, label: '收藏', onClick: onBookmark },
  ]

  return (
    <div className="flex items-center gap-1 mb-2">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.onClick}
          disabled={disabled}
          title={btn.label}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border-0 bg-transparent transition-colors"
        >
          {btn.icon}
          <span className="hidden sm:inline">{btn.label}</span>
        </button>
      ))}
    </div>
  )
}
