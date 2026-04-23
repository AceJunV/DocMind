import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, FileText, Loader2, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocumentStore } from '@/stores/documentStore'
import { AGENT_COLORS, useAgentStore } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useAuthStore } from '@/stores/authStore'
import { isModelConfigValid, useSettingsStore } from '@/stores/settingsStore'
import { createFailedAgentReview, executeAgentReview, generateSummary } from '@/services/reviewEngine'
import { toast } from '@/components/ui/Toast'
import { createId } from '@/utils/id'
import type { AgentReview, Review } from '@/types'

export default function ReviewCreatePage() {
  const [searchParams] = useSearchParams()
  const preselectedDocId = searchParams.get('doc')
  const { user } = useAuthStore()
  const allDocuments = useDocumentStore((state) => state.documents)
  const documents = useMemo(() => allDocuments.filter((document) => document.status === 'ready'), [allDocuments])
  const incrementReviewCount = useDocumentStore((state) => state.incrementReviewCount)
  const agents = useAgentStore((state) => state.agents)
  const incrementUsage = useAgentStore((state) => state.incrementUsage)
  const addReview = useReviewStore((state) => state.addReview)
  const updateReview = useReviewStore((state) => state.updateReview)
  const config = useSettingsStore((state) => state.currentConfig)
  const hasValidConfig = isModelConfigValid(config)

  const autoSelectedDocId = preselectedDocId || (documents.length === 1 ? documents[0].id : '')
  const [selectedDocId, setSelectedDocId] = useState(autoSelectedDocId)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [phase, setPhase] = useState<'config' | 'running' | 'done'>('config')
  const [progress, setProgress] = useState<Record<string, { status: string; text: string }>>({})
  const [reviewId, setReviewId] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const selectedDoc = documents.find((document) => document.id === selectedDocId)
  const selectedAgents = agents.filter((agent) => selectedAgentIds.includes(agent.id))
  const successCount = Object.values(progress).filter((item) => item.status === 'done').length
  const failedCount = Object.values(progress).filter((item) => item.status === 'error').length

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id)
      }

      if (previous.length >= 5) {
        toast('info', '最多选择 5 个 Agent')
        return previous
      }

      return [...previous, id]
    })
  }

  const canStart = Boolean(selectedDocId && selectedAgentIds.length > 0 && hasValidConfig)

  const handleStart = async () => {
    if (!canStart || !selectedDoc) return

    setPhase('running')
    abortRef.current = new AbortController()

    const review: Review = {
      id: createId(),
      document_id: selectedDocId,
      owner_id: user?.id || '',
      status: 'in_progress',
      created_at: new Date().toISOString(),
      agent_reviews: [],
      agents: selectedAgents,
      document: selectedDoc,
    }

    addReview(review)
    setReviewId(review.id)

    const initialProgress: Record<string, { status: string; text: string }> = {}
    for (const agent of selectedAgents) {
      initialProgress[agent.id] = { status: 'pending', text: '' }
    }
    setProgress(initialProgress)

    const results: AgentReview[] = []

    for (const agent of selectedAgents) {
      setProgress((previous) => ({
        ...previous,
        [agent.id]: { status: 'reviewing', text: '' },
      }))

      try {
        const result = await executeAgentReview(
          agent,
          selectedDoc,
          (text) => setProgress((previous) => ({
            ...previous,
            [agent.id]: { status: 'reviewing', text },
          })),
          abortRef.current.signal,
        )

        results.push(result)
        incrementUsage(agent.id)
        setProgress((previous) => ({
          ...previous,
          [agent.id]: { status: 'done', text: '' },
        }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '评审失败'
        results.push(createFailedAgentReview(agent, errorMessage))
        setProgress((previous) => ({
          ...previous,
          [agent.id]: { status: 'error', text: errorMessage },
        }))
      }
    }

    const successfulResults = results.filter((result) => result.status !== 'failed')
    const overallScore = successfulResults.length > 0
      ? successfulResults.reduce((sum, result) => sum + result.score, 0) / successfulResults.length
      : undefined

    const summary = await generateSummary(results)

    updateReview(review.id, {
      status: 'completed',
      overall_score: overallScore,
      agent_reviews: results,
      summary,
    })
    incrementReviewCount(selectedDocId)

    setPhase('done')

    if (successfulResults.length === results.length) {
      toast('success', `评审完成！已生成 ${results.length} 份分析结果`)
      return
    }

    if (successfulResults.length === 0) {
      toast('error', '本次评审全部生成失败，已保留失败记录方便你重试')
      return
    }

    toast('info', `已生成 ${successfulResults.length} 份结果，另有 ${results.length - successfulResults.length} 位角色生成失败`)
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  if (phase === 'done') {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <Check className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">评审已结束</h2>
          <p className="mb-2 text-sm text-gray-600">
            《{selectedDoc?.title}》共选择了 {selectedAgents.length} 位角色
          </p>
          <p className="mb-4 text-sm text-gray-600">
            成功 {successCount} 位，失败 {failedCount} 位。报告页会完整展示全部结果状态。
          </p>
          <Link
            to={`/reviews/${reviewId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white no-underline hover:bg-primary-700"
          >
            查看评审报告
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'running') {
    return (
      <div className="space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold text-gray-900">评审进行中...</h1>
        <p className="text-sm text-gray-500">正在对《{selectedDoc?.title}》进行多角色评审</p>

        <div className="space-y-4">
          {selectedAgents.map((agent) => {
            const item = progress[agent.id]
            const isReviewing = item?.status === 'reviewing'
            const isDone = item?.status === 'done'
            const isError = item?.status === 'error'

            return (
              <div
                key={agent.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                style={{ borderLeftColor: AGENT_COLORS[agent.color], borderLeftWidth: '3px' }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                    style={{ backgroundColor: `${AGENT_COLORS[agent.color]}15` }}
                  >
                    {agent.avatar || agent.name[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-xs text-gray-500">{agent.tagline}</p>
                  </div>
                  {isReviewing && <Loader2 className="h-5 w-5 animate-spin text-primary-500" />}
                  {isDone && <Check className="h-5 w-5 text-emerald-500" />}
                  {isError && <span className="text-xs text-red-500">生成失败</span>}
                </div>

                {isReviewing && item.text && (
                  <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    {item.text.slice(-500)}
                  </div>
                )}

                {isError && item.text && (
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                    {item.text}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <Link to="/reviews" className="flex items-center gap-1 text-sm text-gray-500 no-underline hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> 返回评审大厅
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">发起评审</h1>

      {!hasValidConfig && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          请先到 <Link to="/settings" className="font-medium underline">设置页面</Link> 配置有效的 API Key 和模型，才能开始评审。
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">1. 选择文档</h2>
          {documents.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">还没有就绪的文档</p>
              <Link to="/documents" className="mt-2 inline-block text-xs font-medium text-primary-600 no-underline hover:underline">
                去上传文档
              </Link>
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {documents.map((document) => (
                <button
                  key={document.id}
                  onClick={() => setSelectedDocId(document.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    selectedDocId === document.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50',
                  )}
                >
                  <FileText className={cn('h-5 w-5 shrink-0', selectedDocId === document.id ? 'text-primary-600' : 'text-gray-400')} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{document.title}</p>
                    <p className="text-xs text-gray-500">{document.word_count?.toLocaleString()} 字 · {document.file_type.toUpperCase()}</p>
                  </div>
                  {selectedDocId === document.id && <Check className="h-4 w-4 shrink-0 text-primary-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">2. 选择评审 Agent</h2>
          <p className="mb-4 text-xs text-gray-500">最多选择 5 个 ({selectedAgentIds.length}/5)</p>
          {agents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">还没有 Agent</p>
              <Link to="/agents" className="mt-2 inline-block text-xs font-medium text-primary-600 no-underline hover:underline">
                去创建或添加 Agent
              </Link>
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {agents.map((agent) => {
                const isSelected = selectedAgentIds.includes(agent.id)
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50',
                    )}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{
                        backgroundColor: `${AGENT_COLORS[agent.color]}15`,
                        boxShadow: `0 0 0 1.5px ${AGENT_COLORS[agent.color]}`,
                      }}
                    >
                      {agent.avatar || agent.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.tagline}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary-600" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          开始评审 ({selectedAgentIds.length} 位 Agent)
        </button>
      </div>
    </div>
  )
}
