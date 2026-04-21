import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Document } from '@/types'
import { useActivityStore } from './activityStore'

interface DocumentState {
  documents: Document[]
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  removeDocument: (id: string) => void
  getDocument: (id: string) => Document | undefined
  incrementReviewCount: (id: string) => void
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],

      addDocument: (doc) => {
        set((state) => ({ documents: [doc, ...state.documents] }))
        useActivityStore.getState().addActivity({
          type: 'upload',
          text: `上传了文档《${doc.title}》`,
        })
      },

      updateDocument: (id, updates) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d
          ),
        }))
      },

      removeDocument: (id) => {
        const doc = get().documents.find((d) => d.id === id)
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        }))
        if (doc) {
          useActivityStore.getState().addActivity({
            type: 'upload',
            text: `删除了文档《${doc.title}》`,
          })
        }
      },

      getDocument: (id) => get().documents.find((d) => d.id === id),

      incrementReviewCount: (id) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, review_count: d.review_count + 1 } : d
          ),
        }))
      },
    }),
    { name: 'docmind-documents' }
  )
)
