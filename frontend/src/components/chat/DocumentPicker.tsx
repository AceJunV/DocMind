import { X, FileText } from 'lucide-react'
import type { Document } from '@/types'

interface Props {
  documents: Document[]
  onSelect: (doc: Document) => void
  onClose: () => void
}

export function DocumentPicker({ documents, onSelect, onClose }: Props) {
  const readyDocs = documents.filter((d) => d.status === 'ready')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-5 shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">选择文档</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-transparent border-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {readyDocs.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">暂无可用文档</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {readyDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelect(doc)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer bg-white dark:bg-gray-800 transition-colors"
              >
                <FileText className="h-5 w-5 text-primary-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{doc.file_type.toUpperCase()} · {doc.file_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
