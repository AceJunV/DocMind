import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReviewBookmark, BookmarkCategory } from '@/types'
import { createId } from '@/utils/id'

interface ReviewBookmarkState {
  bookmarks: Record<string, ReviewBookmark[]>
  addBookmark: (reviewId: string, bookmark: Omit<ReviewBookmark, 'id' | 'createdAt'>) => void
  removeBookmark: (reviewId: string, bookmarkId: string) => void
  markAsDiscussed: (reviewId: string) => void
  getBookmarksByReview: (reviewId: string) => ReviewBookmark[]
  getBookmarksByCategory: (reviewId: string, category: BookmarkCategory) => ReviewBookmark[]
}

export const useReviewBookmarkStore = create<ReviewBookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: {},

      addBookmark: (reviewId, bookmark) => {
        const newBookmark: ReviewBookmark = {
          ...bookmark,
          id: createId(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          bookmarks: {
            ...state.bookmarks,
            [reviewId]: [...(state.bookmarks[reviewId] || []), newBookmark],
          },
        }))
      },

      removeBookmark: (reviewId, bookmarkId) => {
        set((state) => ({
          bookmarks: {
            ...state.bookmarks,
            [reviewId]: (state.bookmarks[reviewId] || []).filter((b) => b.id !== bookmarkId),
          },
        }))
      },

      markAsDiscussed: (reviewId) => {
        set((state) => ({
          bookmarks: {
            ...state.bookmarks,
            [reviewId]: (state.bookmarks[reviewId] || []).map((b) => ({ ...b, discussed: true })),
          },
        }))
      },

      getBookmarksByReview: (reviewId) => {
        return get().bookmarks[reviewId] || []
      },

      getBookmarksByCategory: (reviewId, category) => {
        return (get().bookmarks[reviewId] || []).filter((b) => b.category === category)
      },
    }),
    {
      name: 'docmind-review-bookmarks',
      partialize: (state) => ({ bookmarks: state.bookmarks }),
    }
  )
)