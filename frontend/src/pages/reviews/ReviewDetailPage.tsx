import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Download, RefreshCw, Check, Lightbulb, Users, ClipboardCheck, Copy } from 'lucide-react'
import { AGENT_COLORS } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'

const PRIORITY_STYLES = {
  high: { label: '高', color: 'bg-red-50 text-red-600 border-red-200' },
  medium: { label: '中', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  low: { label: '低', color: 'bg-green-50 text-green-600 border-green-200' },
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const review = useReviewStore((s) => s.reviews.find((r) => r.id === id))
  const toggleSuggestionAdopted = useReviewStore((s) => s.toggleSuggestionAdopted)

  if (!review) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Link to="/reviews" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-underline">
          <ArrowLeft className="h-4 w-4" /> 返回评审大厅
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">评审记录不存在或已被删除</p>
          <Link to="/reviews" className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 no-underline">
            返回评审大厅
          </Link>
        </div>
      </div>
    )
  }

  const agentReviews = review.agent_reviews || []
  const consensus = review.summary?.consensus || []
  const controversies = review.summary?.controversies || []
  const allSuggestions = agentReviews.flatMap((ar) => ar.suggestions)
  const docTitle = review.document?.title || '未知文档'

  const buildReportMarkdown = () => {
    const lines = [
      `# 《${docTitle}》评审报告`,
      '',
      `- **综合评分**：${review.overall_score?.toFixed(1) || '-'}`,
      `- **评审时间**：${new Date(review.created_at).toLocaleDateString('zh-CN')}`,
      `- **参与 Agent**：${agentReviews.map((ar) => ar.agent_name).join('、')}`,
      '',
      '---',
      '',
      '## Agent 评审结果',
      '',
      ...agentReviews.map((ar) => [
        `### ${ar.agent_name} - ${ar.score.toFixed(1)} 分`,
        '',
        ar.opinion,
        '',
        '**维度评分：**',
        ...ar.dimensions.map((d) => `- ${d.name}: ${d.score.toFixed(1)}/5`),
        '',
        '**修改建议：**',
        ...ar.suggestions.map((s) => `- [${s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}] ${s.content}${s.adopted ? ' ✅已采纳' : ''}`),
        '',
      ].join('\n')),
    ]
    return lines.join('\n')
  }

  const handleExport = () => {
    const text = buildReportMarkdown()
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `评审报告_${docTitle}_${new Date(review.created_at).toLocaleDateString('zh-CN')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast('success', '评审报告已下载')
  }

  const handleCopy = () => {
    const text = buildReportMarkdown()
    navigator.clipboard.writeText(text)
    toast('success', '评审报告已复制到剪贴板')
  }

  const handleCreateChat = () => {
    navigate(`/chat?review=${review.id}`)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <Link to="/reviews" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-underline">
        <ArrowLeft className="h-4 w-4" /> 返回评审大厅
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">《{docTitle}》评审报告</h1>
          <p className="text-sm text-gray-500 mt-0.5">{agentReviews.length} 位 Agent 参与评审</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreateChat}
            className="flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-100 cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" /> 进入辩论
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer bg-white"
          >
            <Download className="h-4 w-4" /> 下载报告
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer bg-white"
          >
            <Copy className="h-4 w-4" /> 复制
          </button>
          <Link
            to={`/reviews/create?doc=${review.document_id}`}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 no-underline"
          >
            <RefreshCw className="h-4 w-4" /> 重新评审
          </Link>
        </div>
      </div>

      {review.overall_score != null && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm text-gray-500 mb-2">综合评分</p>
          <p className="text-5xl font-bold text-gray-900">{review.overall_score.toFixed(1)}</p>
          <div className="text-2xl text-yellow-500 mt-1">
            {'★'.repeat(Math.round(review.overall_score))}{'☆'.repeat(5 - Math.round(review.overall_score))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {agentReviews.length} 位 Agent · {consensus.length} 个共识 · {controversies.length} 个争议 · {allSuggestions.length} 条建议
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" /> Agent 观点
          </h2>
          {agentReviews.map((ar) => (
            <div
              key={ar.agent_id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              style={{ borderLeftWidth: '3px', borderLeftColor: AGENT_COLORS[ar.agent_color] }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
                    style={{ backgroundColor: AGENT_COLORS[ar.agent_color] + '15' }}
                  >
                    {review.agents?.find((a) => a.id === ar.agent_id)?.avatar || ar.agent_name[0]}
                  </div>
                  <span className="font-semibold text-gray-900">{ar.agent_name}</span>
                </div>
                <span className="text-xl font-bold" style={{ color: AGENT_COLORS[ar.agent_color] }}>{ar.score.toFixed(1)}</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-3 whitespace-pre-wrap">{ar.opinion}</p>
              <div className="space-y-1.5">
                {ar.dimensions.map((dim) => (
                  <div key={dim.name} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-gray-500">{dim.name}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${dim.score * 20}%`, backgroundColor: AGENT_COLORS[ar.agent_color] }} />
                    </div>
                    <span className="text-gray-500 w-6 text-right">{dim.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {consensus.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3">
                共识 ({consensus.length})
              </h3>
              <div className="space-y-2">
                {consensus.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {controversies.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3">
                争议 ({controversies.length})
              </h3>
              {controversies.map((c, i) => (
                <div key={i} className="space-y-2 mb-3 last:mb-0">
                  <p className="text-sm font-medium text-gray-800">{c.topic}</p>
                  {c.opinions.map((op) => (
                    <div key={op.agent_name} className="flex items-start gap-2 text-sm rounded-lg bg-white/70 p-2.5">
                      <div>
                        <span className="font-medium" style={{ color: AGENT_COLORS[op.agent_color] }}>{op.agent_name}:</span>{' '}
                        <span className="text-gray-600">{op.stance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {allSuggestions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-amber-500" /> 优化建议 ({allSuggestions.length})
              </h3>
              <div className="space-y-2">
                {allSuggestions.map((s) => {
                  const priority = PRIORITY_STYLES[s.priority]
                  return (
                    <div key={s.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                      <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium border', priority.color)}>
                        {priority.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm text-gray-700', s.adopted && 'line-through text-gray-400')}>{s.content}</p>
                        <p className="text-xs text-gray-400 mt-0.5">来自 {s.source_agent}</p>
                      </div>
                      <button
                        onClick={() => toggleSuggestionAdopted(review.id, s.id)}
                        className={cn(
                          'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer border transition-colors',
                          s.adopted
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        {s.adopted ? '已采纳' : '采纳'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
