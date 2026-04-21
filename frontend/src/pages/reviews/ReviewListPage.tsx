import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Clock, ArrowRight, FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENT_COLORS } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export default function ReviewListPage() {
  const reviews = useReviewStore((s) => s.reviews)
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'in_progress'>('all')

  const filteredReviews = reviews.filter((r) =>
    activeTab === 'all' ? true : r.status === activeTab
  )

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">评审大厅</h1>
          <p className="text-sm text-gray-500 mt-1">查看所有评审记录，发起新的评审</p>
        </div>
        <Link
          to="/reviews/create"
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors no-underline"
        >
          <Plus className="h-4 w-4" />
          发起评审
        </Link>
      </div>

      <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 w-fit">
        {[
          { key: 'all' as const, label: `全部 (${reviews.length})` },
          { key: 'completed' as const, label: '已完成' },
          { key: 'in_progress' as const, label: '进行中' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer border-0',
              activeTab === tab.key ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:text-gray-700 bg-transparent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredReviews.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {reviews.length === 0 ? '还没有评审记录' : '没有匹配的评审记录'}
          </p>
          <p className="text-sm text-gray-400 mt-1">上传文档并添加 Agent 后，发起你的第一次评审</p>
          <Link
            to="/reviews/create"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 no-underline"
          >
            <Plus className="h-4 w-4" /> 发起评审
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Link
              key={review.id}
              to={`/reviews/${review.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md no-underline group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary-50 p-2.5">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {review.document?.title || '未知文档'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        review.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      )}>
                        {review.status === 'completed' ? '已完成' : '进行中'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(review.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {review.status === 'completed' && review.overall_score != null && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">{review.overall_score.toFixed(1)}</div>
                    <div className="text-yellow-500 text-sm">
                      {'★'.repeat(Math.round(review.overall_score))}{'☆'.repeat(5 - Math.round(review.overall_score))}
                    </div>
                  </div>
                )}
              </div>

              {review.agent_reviews && review.agent_reviews.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-gray-500">评审团：</span>
                  <div className="flex items-center gap-2">
                    {review.agent_reviews.map((ar) => (
                      <div key={ar.agent_id} className="flex items-center gap-1.5">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                          style={{ backgroundColor: AGENT_COLORS[ar.agent_color] + '15', boxShadow: `0 0 0 1.5px ${AGENT_COLORS[ar.agent_color]}` }}
                        >
                          {review.agents?.find((a) => a.id === ar.agent_id)?.avatar || ar.agent_name[0]}
                        </div>
                        <span className="text-xs text-gray-600">{ar.agent_name}</span>
                        {ar.score > 0 && (
                          <span className="text-xs font-medium" style={{ color: AGENT_COLORS[ar.agent_color] }}>
                            {ar.score.toFixed(1)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.status === 'completed' && review.summary && (
                <div className="flex items-center gap-4 border-t border-gray-100 pt-3">
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {review.summary.consensus.length} 个共识
                  </span>
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {review.summary.controversies.length} 个争议
                  </span>
                  <span className="flex items-center gap-1 text-xs text-primary-600">
                    <span className="h-2 w-2 rounded-full bg-primary-500" />
                    {review.summary.top_suggestions.length} 条建议
                  </span>
                  <span className="ml-auto flex items-center text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    查看详情 <ArrowRight className="h-3 w-3 ml-1" />
                  </span>
                </div>
              )}

              {review.status === 'in_progress' && (
                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-amber-600">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    评审进行中
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
