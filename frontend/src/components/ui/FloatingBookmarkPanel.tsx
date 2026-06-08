import { useMemo, useState } from 'react'
import { MessageCircle, ChevronDown, ChevronRight, Star, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useReviewBookmarkStore } from '@/stores/reviewBookmarkStore'
import { BOOKMARK_CATEGORY_CONFIG } from '@/types'
import { contentHash } from '@/utils/contentHash'
import type { BookmarkCategory } from '@/types'

const CATEGORIES: BookmarkCategory[] = ['痛点', '亮点', '疑问', '建议', '其他']

interface Props {
  reviewId: string
  onEnterChat: () => void
}

function scrollToBookmark(section: string, fullContent: string) {
  const id = contentHash(`${section}:${fullContent}`)
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('ring-2', 'ring-primary-400', 'ring-offset-2', 'transition-all')
    setTimeout(() => {
      el.classList.remove('ring-2', 'ring-primary-400', 'ring-offset-2', 'transition-all')
    }, 1500)
  }
}

export default function FloatingBookmarkPanel({ reviewId, onEnterChat }: Props) {
  const bookmarksRaw = useReviewBookmarkStore((s) => s.bookmarks[reviewId])
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ '痛点': true })
  const [discussedExpanded, setDiscussedExpanded] = useState(false)

  const bookmarks = bookmarksRaw || []

  const { activeBookmarks, discussedBookmarks } = useMemo(() => {
    const active = bookmarks.filter((b) => !b.discussed)
    const discussed = bookmarks.filter((b) => b.discussed)
    return { activeBookmarks: active, discussedBookmarks: discussed }
  }, [bookmarks])

  const groupedActive = useMemo(() => {
    const groups: Record<BookmarkCategory, typeof activeBookmarks> = {} as Record<BookmarkCategory, typeof activeBookmarks>
    for (const cat of CATEGORIES) {
      groups[cat] = activeBookmarks.filter((b) => b.category === cat)
    }
    return groups
  }, [activeBookmarks])

  const activeCount = activeBookmarks.length
  const discussedCount = discussedBookmarks.length

  const toggleCategory = (cat: BookmarkCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  return (
    <div className="fixed right-5 top-24 z-40 hidden lg:block w-56">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-lg divide-y divide-gray-100">
        <div className="p-4">
          <Button onClick={onEnterChat} className="w-full">
            <MessageCircle className="h-4 w-4" />
            进入研讨
          </Button>
          {(activeCount > 0 || discussedCount > 0) && (
            <p className="mt-2 text-center text-xs text-gray-400">
              已标记 {activeCount} 处{discussedCount > 0 ? ` · 已讨论 ${discussedCount} 处` : ''}
            </p>
          )}
        </div>

        {activeCount > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {CATEGORIES.map((cat) => {
              const items = groupedActive[cat]
              if (items.length === 0) return null
              const config = BOOKMARK_CATEGORY_CONFIG[cat]
              const isExpanded = expandedCategories[cat] !== false
              return (
                <div key={cat} className="border-b border-gray-50 last:border-b-0">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium hover:bg-gray-50 cursor-pointer border-0 bg-transparent"
                  >
                    <span className={cn('flex items-center gap-1', config.color)}>
                      <span>{config.icon}</span>
                      <span>{cat}</span>
                      <span className="text-gray-400">({items.length})</span>
                    </span>
                    {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-2 space-y-1">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => scrollToBookmark(item.section, item.fullContent)}
                          className={cn('w-full text-left rounded px-2 py-1 text-xs text-gray-600 truncate cursor-pointer hover:bg-gray-100 border-0 bg-transparent', config.bgColor)}
                          title={item.fullContent}
                        >
                          {item.content}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {discussedCount > 0 && (
          <div>
            <button
              onClick={() => setDiscussedExpanded(!discussedExpanded)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-gray-400 hover:bg-gray-50 cursor-pointer border-0 bg-transparent"
            >
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                已讨论 ({discussedCount})
              </span>
              {discussedExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {discussedExpanded && (
              <div className="px-3 pb-2 space-y-1">
                {discussedBookmarks.map((item) => {
                  const config = BOOKMARK_CATEGORY_CONFIG[item.category]
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToBookmark(item.section, item.fullContent)}
                      className="w-full text-left rounded px-2 py-1 text-xs text-gray-400 line-through truncate cursor-pointer hover:bg-gray-50 border-0 bg-transparent"
                      title={item.fullContent}
                    >
                      <span className={cn('mr-1', config.color)}>{config.icon}</span>
                      {item.content}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeCount === 0 && discussedCount === 0 && (
          <div className="px-4 py-3 text-center">
            <Star className="mx-auto h-5 w-5 text-gray-300 mb-1" />
            <p className="text-xs text-gray-400">标记段落后可添加到研讨议程</p>
          </div>
        )}
      </div>
    </div>
  )
}