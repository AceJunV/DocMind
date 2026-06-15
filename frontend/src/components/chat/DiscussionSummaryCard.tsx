import { X, Sparkles, Loader2 } from 'lucide-react'
import type { DiscussionSummary } from '@/types'

interface Props {
  summary: DiscussionSummary | null
  loading: boolean
  error?: string | null
  onGenerate: () => void
  onClose: () => void
}

export function DiscussionSummaryCard({ summary, loading, error, onGenerate, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-30 bg-white dark:bg-gray-800 flex flex-col rounded-xl">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-amber-500" /> 讨论总结
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 text-primary-500 animate-spin" />
            <p className="text-sm text-gray-500">正在生成讨论总结...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <p className="text-sm text-red-500 text-center">{error}</p>
            <button
              onClick={onGenerate}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 cursor-pointer border-0 transition-colors"
            >
              重新生成
            </button>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            {summary.keyPoints.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">核心观点</h4>
                <ul className="space-y-1.5">
                  {summary.keyPoints.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="text-primary-500 shrink-0">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {summary.agreements.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">共识</h4>
                <ul className="space-y-1.5">
                  {summary.agreements.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="text-green-500 shrink-0">✓</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {summary.disagreements.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">分歧</h4>
                <ul className="space-y-1.5">
                  {summary.disagreements.map((d, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="text-orange-500 shrink-0">△</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {summary.actionItems.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">待办事项</h4>
                <ul className="space-y-1.5">
                  {summary.actionItems.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
                      <span className="text-blue-500 shrink-0">→</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="text-[10px] text-gray-400 text-right mt-3">
              生成于 {new Date(summary.generatedAt).toLocaleString('zh-CN')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Sparkles className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">暂无讨论总结</p>
            <button
              onClick={onGenerate}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 cursor-pointer border-0 transition-colors"
            >
              生成总结
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
