import { useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudUpload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/authStore'
import { parseDocument, createDocumentFromFile, SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from '@/services/documentParser'
import { toast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface DocumentUploadModalProps {
  open: boolean
  onClose: () => void
  onUploaded?: (documentId: string) => void
}

export function DocumentUploadModal({ open, onClose, onUploaded }: DocumentUploadModalProps) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const addDocument = useDocumentStore((state) => state.addDocument)
  const updateDocument = useDocumentStore((state) => state.updateDocument)

  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        toast('error', `不支持的文件格式：${ext}，请上传 PDF、DOC、DOCX、WPS、MD 或 TXT`)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        toast('error', '文件大小超过 20MB 限制')
        return
      }

      const document = createDocumentFromFile(file, user?.id || '')
      addDocument(document)
      onClose()

      try {
        const result = await parseDocument(file)
        updateDocument(document.id, {
          raw_content: result.raw_content,
          structured_content: result.structured_content,
          word_count: result.word_count,
          teaching_plan: result.teaching_plan,
          status: 'ready',
        })
        toast('success', `《${document.title}》解析完成`)
        if (onUploaded) {
          onUploaded(document.id)
        } else {
          navigate(`/documents/${document.id}`)
        }
      } catch (error) {
        updateDocument(document.id, { status: 'error' })
        toast('error', `解析失败：${error instanceof Error ? error.message : '未知错误'}`)
      }
    },
    [user, addDocument, updateDocument, navigate, onClose, onUploaded]
  )

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true)
      for (const file of Array.from(files)) {
        await processFile(file)
      }
      setUploading(false)
    },
    [processFile]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setDragActive(false)
      if (event.dataTransfer.files.length > 0) {
        handleFiles(event.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !uploading && onClose()}>
      <div
        className="dm-panel mx-4 w-full max-w-xl rounded-[28px] p-6 shadow-xl animate-slide-up"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">上传文档</h3>
            <p className="mt-1 text-xs text-gray-500">上传后会自动解析为可评审的结构化内容。</p>
          </div>
          <button
            onClick={() => !uploading && onClose()}
            className="rounded-md border-0 bg-transparent p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            'rounded-[24px] border-2 border-dashed p-10 text-center transition-all',
            dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white/70 hover:border-primary-300 hover:bg-primary-50/50',
            uploading && 'pointer-events-none opacity-70'
          )}
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <CloudUpload className="mx-auto mb-4 h-12 w-12 text-primary-500" />
          {uploading ? (
            <>
              <p className="text-sm font-medium text-primary-600">正在解析文档...</p>
              <p className="mt-2 text-xs text-gray-500">系统会尽量提取课题、目标、重点、难点和教学过程。</p>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-gray-900">拖拽文件到这里</p>
              <p className="mt-2 text-sm text-gray-500">或点击按钮手动选择文件</p>
            </>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="info">PDF</Badge>
            <Badge variant="info">DOC</Badge>
            <Badge variant="info">DOCX</Badge>
            <Badge variant="info">WPS</Badge>
            <Badge variant="info">MD</Badge>
            <Badge variant="info">TXT</Badge>
          </div>

          <p className="mt-4 text-xs text-gray-400">单个文件不超过 20MB</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.wps,.md,.txt"
            className="hidden"
            multiple
            onChange={(event) => event.target.files && handleFiles(event.target.files)}
          />

          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-5">
            选择文件
          </Button>
        </div>
      </div>
    </div>
  )
}