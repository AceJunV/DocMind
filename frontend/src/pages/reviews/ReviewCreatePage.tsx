import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText, Check, Play, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocumentStore } from '@/stores/documentStore'
import { useAgentStore, AGENT_COLORS } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useAuthStore } from '@/stores/authStore'
import { isModelConfigValid, useSettingsStore } from '@/stores/settingsStore'
import { executeAgentReview, generateSummary } from '@/services/reviewEngine'
import { toast } from '@/components/ui/Toast'
import { createId } from '@/utils/id'
import type { Agent, AgentReview, Review } from '@/types'

export default function ReviewCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedDocId = searchParams.get('doc')
  const { user } = useAuthStore()
  const allDocuments = useDocumentStore((s) => s.documents)
  const documents = useMemo(() => allDocuments.filter((d) => d.status === 'ready'), [allDocuments])
  const incrementReviewCount = useDocumentStore((s) => s.incrementReviewCount)
  const agents = useAgentStore((s) => s.agents)
  const incrementUsage = useAgentStore((s) => s.incrementUsage)
  const addReview = useReviewStore((s) => s.addReview)
  const updateReview = useReviewStore((s) => s.updateReview)
  const config = useSettingsStore((s) => s.currentConfig)
  const hasValidConfig = isModelConfigValid(config)

  const autoSelectedDocId = preselectedDocId || (documents.length === 1 ? documents[0].id : '')
  const [selectedDocId, setSelectedDocId] = useState(autoSelectedDocId)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [phase, setPhase] = useState<'config' | 'running' | 'done'>('config')
  const [progress, setProgress] = useState<Record<string, { status: string; text: string }>>({})
  const [reviewId, setReviewId] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const selectedDoc = documents.find((d) => d.id === selectedDocId)
  const selectedAgents = agents.filter((a) => selectedAgentIds.includes(a.id))

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) { toast('info', '最多选择 5 个 Agent'); return prev }
      return [...prev, id]
    })
  }

  const canStart = selectedDocId && selectedAgentIds.length > 0 && hasValidConfig

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
    for (const a of selectedAgents) {
      initialProgress[a.id] = { status: 'pending', text: '' }
    }
    setProgress(initialProgress)

    const results: AgentReview[] = []

    for (const agent of selectedAgents) {
      setProgress((p) => ({ ...p, [agent.id]: { status: 'reviewing', text: '' } }))
      try {
        const result = await executeAgentReview(
          agent, selectedDoc,
          (text) => setProgress((p) => ({ ...p, [agent.id]: { status: 'reviewing', text } })),
          abortRef.current.signal,
        )
        results.push(result)
        incrementUsage(agent.id)
        setProgress((p) => ({ ...p, [agent.id]: { status: 'done', text: '' } }))
      } catch (err) {
        setProgress((p) => ({ ...p, [agent.id]: { status: 'error', text: err instanceof Error ? err.message : '评审失败' } }))
      }
    }

    const overallScore = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0

    const summary = await generateSummary(results)

    updateReview(review.id, {
      status: 'completed',
      overall_score: overallScore,
      agent_reviews: results,
      summary,
    })
    incrementReviewCount(selectedDocId)

    setPhase('done')
    toast('success', `评审完成！综合评分 ${overallScore.toFixed(1)}`)
  }

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  if (phase === 'done') {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <Check className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">评审完成！</h2>
          <p className="text-sm text-gray-600 mb-4">
            {selectedAgents.length} 位 Agent 已完成对《{selectedDoc?.title}》的评审
          </p>
          <Link
            to={`/reviews/${reviewId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 no-underline"
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
            const p = progress[agent.id]
            const isReviewing = p?.status === 'reviewing'
            const isDone = p?.status === 'done'
            const isError = p?.status === 'error'
            return (
              <div
                key={agent.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                style={{ borderLeftWidth: '3px', borderLeftColor: AGENT_COLORS[agent.color] }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                    style={{ backgroundColor: AGENT_COLORS[agent.color] + '15' }}
                  >
                    {agent.avatar || agent.name[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-xs text-gray-500">{agent.tagline}</p>
                  </div>
                  {isReviewing && <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />}
                  {isDone && <Check className="h-5 w-5 text-emerald-500" />}
                  {isError && <span className="text-xs text-red-500">{p.text}</span>}
                </div>
                {isReviewing && p.text && (
                  <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    {p.text.slice(-500)}
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
      <Link to="/reviews" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-underline">
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. 选择文档</h2>
          {documents.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">还没有就绪的文档</p>
              <Link to="/documents" className="mt-2 inline-block text-xs text-primary-600 font-medium no-underline hover:underline">
                去上传文档
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer',
                    selectedDocId === doc.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <FileText className={cn('h-5 w-5 shrink-0', selectedDocId === doc.id ? 'text-primary-600' : 'text-gray-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500">{doc.word_count?.toLocaleString()} 字 · {doc.file_type.toUpperCase()}</p>
                  </div>
                  {selectedDocId === doc.id && <Check className="h-4 w-4 text-primary-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">2. 选择评审 Agent</h2>
          <p className="text-xs text-gray-500 mb-4">最多选择 5 个 ({selectedAgentIds.length}/5)</p>
          {agents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">还没有 Agent</p>
              <Link to="/agents" className="mt-2 inline-block text-xs text-primary-600 font-medium no-underline hover:underline">
                去创建或添加 Agent
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {agents.map((agent) => {
                const isSelected = selectedAgentIds.includes(agent.id)
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer',
                      isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                    )}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm shrink-0"
                      style={{ backgroundColor: AGENT_COLORS[agent.color] + '15', boxShadow: `0 0 0 1.5px ${AGENT_COLORS[agent.color]}` }}
                    >
                      {agent.avatar || agent.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.tagline}</p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary-600 shrink-0" />}
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
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 transition-colors"
        >
          <Play className="h-4 w-4" />
          开始评审 ({selectedAgentIds.length} 位 Agent)
        </button>
      </div>
    </div>
  )
}
