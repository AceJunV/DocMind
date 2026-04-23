import { useState } from 'react'
import type { ChatMessageReaction } from '@/types'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🤔', '👏', '🔥']

interface Props {
  reactions?: ChatMessageReaction[]
  onReact: (emoji: string) => void
}

export function EmojiReactionBar({ reactions = [], onReact }: Props) {
  const [showPicker, setShowPicker] = useState(false)

  const existingReactions = reactions.filter((r) => r.userReacted || r.agentIds.length > 0)

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {existingReactions.map((r) => {
        const count = (r.userReacted ? 1 : 0) + r.agentIds.length
        return (
          <button
            key={r.emoji}
            onClick={() => onReact(r.emoji)}
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs border cursor-pointer transition-colors ${
              r.userReacted
                ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        )
      })}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300 cursor-pointer border-0 bg-transparent transition-colors opacity-0 group-hover:opacity-100"
          title="添加反应"
        >
          +
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 flex gap-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 shadow-lg z-10">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(emoji); setShowPicker(false) }}
                className="text-base hover:scale-125 transition-transform cursor-pointer border-0 bg-transparent p-0.5"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
