import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Star, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReviewBookmarkStore } from '@/stores/reviewBookmarkStore'
import { BOOKMARK_CATEGORY_CONFIG } from '@/types'
import { contentHash } from '@/utils/contentHash'
import type { BookmarkCategory } from '@/types'
import type { ReviewBookmark } from '@/types'

interface Props {
  reviewId: string
  section: string
  content: string
  className?: string
  sourceAgentIds?: string
}

const CATEGORIES: BookmarkCategory[] = ['痛点', '亮点', '疑问', '建议', '其他']

export default function BookmarkableParagraph({ reviewId, section, content, className, sourceAgentIds }: Props) {
  const elementId = useMemo(() => contentHash(`${section}:${content}`), [section, content])
  const [showPopover, setShowPopover] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const popoverRef = useRef<HTMLDivElement>(null)
  const starRef = useRef<HTMLButtonElement>(null)
  const bookmarks = useReviewBookmarkStore((s) => s.bookmarks[reviewId])
  const addBookmark = useReviewBookmarkStore((s) => s.addBookmark)
  const removeBookmark = useReviewBookmarkStore((s) => s.removeBookmark)

  const bookmarkList = bookmarks || []
  const existingBookmark = bookmarkList.find((b) => b.fullContent === content && b.section === section) as ReviewBookmark | undefined
  const isDiscussed = existingBookmark?.discussed === true

  useEffect(() => {
    if (!showPopover) return
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        starRef.current &&
        !starRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPopover])

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isDiscussed) return
    if (existingBookmark) {
      removeBookmark(reviewId, existingBookmark.id)
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      setPopoverStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: Math.max(8, rect.left - 40),
        zIndex: 9999,
      })
      setShowPopover(true)
    }
  }, [existingBookmark, isDiscussed, removeBookmark, reviewId])

  const handleCategorySelect = useCallback((category: BookmarkCategory) => {
    addBookmark(reviewId, {
      reviewId,
      content: content.slice(0, 30),
      fullContent: content,
      category,
      section,
      source_agent_id: sourceAgentIds,
    })
    setShowPopover(false)
  }, [addBookmark, reviewId, content, section, sourceAgentIds])

  const categoryConfig = existingBookmark ? BOOKMARK_CATEGORY_CONFIG[existingBookmark.category] : null

  return (
    <>
      <div
        id={elementId}
        className={cn(
          'group/paragraph relative flex items-start gap-2',
          categoryConfig ? `rounded-md ${categoryConfig.bgColor} border-l-2 ${categoryConfig.borderColor} pl-3` : ''
        )}
      >
        <p className={cn('flex-1', className)}>{content}</p>

        <button
          ref={starRef}
          onClick={handleStarClick}
          className={cn(
            'mt-0.5 shrink-0 rounded p-0.5 transition-colors border-0 bg-transparent',
            isDiscussed ? 'cursor-default' : 'cursor-pointer',
            existingBookmark && !isDiscussed ? '' : 'hover:bg-gray-100'
          )}
          title={isDiscussed ? '已讨论' : existingBookmark ? '取消标记' : '标记此段落'}
        >
          <span className="relative inline-flex items-center justify-center">
            {isDiscussed ? (
              <CheckCircle className="h-4 w-4 fill-green-500 text-white" strokeWidth={2} />
            ) : (
              <Star
                className={cn(
                  'h-3.5 w-3.5',
                  existingBookmark
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-gray-300 hover:text-amber-400'
                )}
              />
            )}
          </span>
        </button>
      </div>

      {showPopover && createPortal(
        <div
          ref={popoverRef}
          className="rounded-xl border border-gray-200 bg-white p-2 shadow-lg animate-slide-up"
          style={popoverStyle}
        >
          <div className="flex flex-col gap-1">
            {CATEGORIES.map((category) => {
              const config = BOOKMARK_CATEGORY_CONFIG[category]
              return (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer hover:border-gray-300 hover:bg-gray-50 ${config.color}`}
                >
                  <span>{config.icon}</span>
                  <span>{category}</span>
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}