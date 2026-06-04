import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  ClipboardCheck,
  Clock3,
  CloudUpload,
  FileText,
  Loader2,
  MessageCircle,
  Sparkles,
  Star,
  Trophy,
  Upload,
} from 'lucide-react'
import { OnboardingGuide } from '@/components/ui/OnboardingGuide'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useDocumentStore } from '@/stores/documentStore'
import { AGENT_COLORS, useAgentStore } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useChatStore } from '@/stores/chatStore'
import { useActivityStore, type Activity } from '@/stores/activityStore'
import { formatTimeAgo } from '@/utils/format'
import { parseDocument, createDocumentFromFile, SUPPORTED_EXTENSIONS, MAX_FILE_SIZE } from '@/services/documentParser'
import { toast } from '@/components/ui/Toast'

const FLOW_STEPS = [
  { icon: Upload, label: '上传教案', description: '上传 PDF、DOC、DOCX、Markdown 或 TXT 格式的教研案文档' },
  { icon: Bot, label: '准备评审', description: '选择评审角色，配置不同视角的专业评委' },
  { icon: ClipboardCheck, label: '发起评审', description: '多角色并行分析，生成共识、争议点与改进建议' },
  { icon: MessageCircle, label: '进入研讨', description: '围绕评审结论继续讨论，角色主动推进重点问题' },
]

const TYPE_DOT: Record<Activity['type'], string> = {
  review: 'bg-emerald-500',
  upload: 'bg-blue-500',
  agent: 'bg-violet-500',
  chat: 'bg-amber-500',
}

function getReviewTone(score?: number) {
  if (score == null) {
    return 'default' as const
  }

  if (score >= 4.2) {
    return 'success' as const
  }

  if (score >= 3.5) {
    return 'warning' as const
  }

  return 'danger' as const
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const documents = useDocumentStore((state) => state.documents)
  const addDocument = useDocumentStore((state) => state.addDocument)
  const updateDocument = useDocumentStore((state) => state.updateDocument)
  const agents = useAgentStore((state) => state.agents)
  const reviews = useReviewStore((state) => state.reviews)
  const rooms = useChatStore((state) => state.rooms)
  const activities = useActivityStore((state) => state.activities)

  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const completedReviews = reviews.filter((review) => review.status === 'completed')
  const readyDocuments = documents.filter((document) => document.status === 'ready')
  const recentReviews = completedReviews.slice(0, 5)
  const recentActivities = activities.slice(0, 6)
  const agentRanking = [...agents].sort((left, right) => right.usage_count - left.usage_count).slice(0, 5)

  const insightCards = [
    {
      label: '就绪文档',
      value: readyDocuments.length,
      meta: `${documents.length} 份总文档`,
      icon: FileText,
    },
    {
      label: '评审完成',
      value: completedReviews.length,
      meta: `${reviews.length} 次评审流程`,
      icon: ClipboardCheck,
    },
    {
      label: '活跃研讨',
      value: rooms.filter((room) => room.status === 'active').length,
      meta: `${rooms.length} 个聊天室`,
      icon: MessageCircle,
    },
    {
      label: '角色储备',
      value: agents.length,
      meta: `${agents.filter((agent) => agent.source === 'template').length} 个模板角色`,
      icon: Bot,
    },
  ]

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      const unsupportedFiles: string[] = []
      const oversizedFiles: string[] = []
      const validFiles: File[] = []

      for (const file of fileArray) {
        const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
          unsupportedFiles.push(file.name)
          continue
        }
        if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file.name)
          continue
        }
        validFiles.push(file)
      }

      if (unsupportedFiles.length > 0) {
        toast('error', `不支持的文件格式：${unsupportedFiles.join('、')}`)
      }
      if (oversizedFiles.length > 0) {
        toast('error', `文件超过 20MB 限制：${oversizedFiles.join('、')}`)
      }

      if (validFiles.length === 0) return

      setUploading(true)
      const parsedDocIds: string[] = []
      let lastReadyDocId = ''
      let hasError = false

      for (const file of validFiles) {
        const doc = createDocumentFromFile(file, user?.id || '')
        addDocument(doc)
        parsedDocIds.push(doc.id)

        try {
          const result = await parseDocument(file)
          updateDocument(doc.id, {
            raw_content: result.raw_content,
            structured_content: result.structured_content,
            word_count: result.word_count,
            teaching_plan: result.teaching_plan,
            status: 'ready',
          })
          lastReadyDocId = doc.id
          toast('success', `《${doc.title}》解析完成`)
        } catch (error) {
          hasError = true
          updateDocument(doc.id, { status: 'error' })
          toast('error', `《${doc.title}》解析失败：${error instanceof Error ? error.message : '未知错误'}`)
        }
      }

      setUploading(false)

      if (lastReadyDocId) {
        sessionStorage.setItem('dashboard_uploaded_doc_ids', JSON.stringify(parsedDocIds))
        navigate(`/reviews/create?doc=${lastReadyDocId}&from=dashboard`)
      } else if (!hasError || parsedDocIds.length === 0) {
        // no valid files and no navigation needed
      }
    },
    [user, addDocument, updateDocument, navigate],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setDragActive(false)
      if (event.dataTransfer.files.length > 0) {
        processFiles(event.dataTransfer.files)
      }
    },
    [processFiles],
  )

  return (
    <div className="space-y-6 animate-slide-up">
      <OnboardingGuide />

      <section className="dm-hero-card rounded-[28px] px-6 py-6 sm:px-8">
        <div className="relative z-[1] space-y-5">
          <span className="dm-kicker">
            <Sparkles className="h-3.5 w-3.5" />
            DocMind Workspace
          </span>

          <div className="space-y-3">
            <div>
              <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                {user?.name || '体验用户'}，今天先处理最有价值的教学问题。
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 sm:text-[15px]">
                先上传教研案，再让不同角色从目标、难点、课堂节奏和学生理解这些角度给出更深的判断。完成评审后，可直接进入聊天室继续推进争议点。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">专业判断</Badge>
              <Badge variant="info">多角色视角</Badge>
              <Badge variant="warning">研讨推进</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {FLOW_STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={step.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    {index < FLOW_STEPS.length - 1 && (
                      <div className="mt-1 h-2 w-0.5 bg-primary-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-primary-500">Step {index + 1}</span>
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold text-gray-900">{step.label}</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-dashed border-gray-300 bg-white px-6 py-8 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/30 sm:px-8"
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = '' }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
            <p className="text-sm font-medium text-gray-700">正在解析文档...</p>
            <p className="text-xs text-gray-500">解析完成后将自动跳转到发起评审页</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-500">
              <CloudUpload className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">上传教研案文档</h3>
              <p className="mt-1 text-sm text-gray-500">
                拖拽文件到此处，或点击选择文件
              </p>
              <p className="mt-1 text-xs text-gray-400">
                支持 PDF、DOC、DOCX、Markdown、TXT，可多选文件，最大 20MB
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors cursor-pointer border-0"
            >
              <Upload className="h-4 w-4" />
              选择文档上传
            </button>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-2xl">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">角色使用排行</h2>
                <p className="mt-1 text-xs text-gray-500">哪些角色被最频繁地调用，说明它们更贴近当前研讨需求。</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {agentRanking.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bot className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">还没有角色使用数据</p>
                <p className="mt-1 text-xs text-gray-400">发起评审或进入聊天室后，这里会显示最常用的角色。</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {agentRanking.map((agent, index) => {
                  const accent = AGENT_COLORS[agent.color]
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                        {index + 1}
                      </div>
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm"
                        style={{ backgroundColor: `${accent}18`, boxShadow: `0 0 0 1.5px ${accent}` }}
                      >
                        {agent.avatar || agent.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{agent.name}</p>
                        <p className="truncate text-xs text-gray-500">{agent.tagline}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="h-3.5 w-3.5 text-amber-400" />
                        {agent.usage_count} 次
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary-500" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">最近评审</h2>
                <p className="mt-1 text-xs text-gray-500">优先查看刚刚完成的报告，及时把建议转入研讨或修订。</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0">
            {recentReviews.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">还没有评审记录</p>
                <p className="mt-1 text-xs text-gray-400">先上传文档并发起一次评审，这里会出现最近的报告入口。</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentReviews.map((review) => (
                  <div
                    key={review.id}
                    onClick={() => navigate(`/reviews/${review.id}`)}
                    className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="rounded-2xl bg-primary-50 p-2 text-primary-600">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{review.document?.title || '未命名文档'}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {review.agent_reviews?.filter((item) => item.status !== 'failed').length || 0} 位角色完成分析
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.overall_score != null ? (
                        <Badge variant={getReviewTone(review.overall_score)}>{review.overall_score.toFixed(1)} 分</Badge>
                      ) : null}
                      <span className="text-[11px] text-gray-400">{formatTimeAgo(review.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-500" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">运行概览</h2>
                <p className="mt-1 text-xs text-gray-500">把最近的工作状态压缩成一眼能读懂的结构，便于快速判断下一步。</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {insightCards.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="dm-panel-soft rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">{item.value}</p>
                      <p className="mt-1 text-xs text-gray-400">{item.meta}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-2.5 text-primary-600 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-gray-500" />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">最近动态</h2>
                <p className="mt-1 text-xs text-gray-500">保留操作轨迹，但不制造伪交互，重点是让你快速回忆最近发生了什么。</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="py-6 text-center">
                <Clock3 className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">暂时没有动态记录</p>
              </div>
            ) : (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-white/80 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-1 h-2.5 w-2.5 rounded-full', TYPE_DOT[activity.type])} />
                    <div>
                      <p className="text-sm text-gray-700">{activity.text}</p>
                      {activity.score != null ? (
                        <div className="mt-2">
                          <Badge variant={getReviewTone(activity.score)}>{activity.score.toFixed(1)} 分</Badge>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{formatTimeAgo(activity.created_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}