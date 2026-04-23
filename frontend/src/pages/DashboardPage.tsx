import { Link } from 'react-router-dom'
import { OnboardingGuide } from '@/components/ui/OnboardingGuide'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useAgentStore, AGENT_COLORS } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useChatStore } from '@/stores/chatStore'
import { useActivityStore, type Activity } from '@/stores/activityStore'
import {
  FileText, Bot, ClipboardCheck, MessageCircle,
  Upload, Plus, ArrowRight, Clock,
  Trophy, Star,
} from 'lucide-react'

const QUICK_ACTIONS = [
  { icon: Upload, label: '上传教研案', desc: '支持 PDF / Word / MD / TXT 格式', path: '/documents', color: 'bg-blue-50 text-blue-600', hoverBg: 'group-hover:bg-blue-100' },
  { icon: Plus, label: '创建角色', desc: '从模板、自定义或 AI 对话创建评审角色', path: '/agents', color: 'bg-purple-50 text-purple-600', hoverBg: 'group-hover:bg-purple-100' },
  { icon: ClipboardCheck, label: '发起评审', desc: '多角色并行评审教研案', path: '/reviews', color: 'bg-emerald-50 text-emerald-600', hoverBg: 'group-hover:bg-emerald-100' },
  { icon: MessageCircle, label: '教研研讨', desc: '与评审团深度讨论教研案', path: '/chat', color: 'bg-orange-50 text-orange-600', hoverBg: 'group-hover:bg-orange-100' },
]

const TYPE_DOT: Record<Activity['type'], string> = {
  review: 'bg-emerald-500', upload: 'bg-blue-500', agent: 'bg-purple-500', chat: 'bg-orange-500',
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const documents = useDocumentStore((s) => s.documents)
  const agents = useAgentStore((s) => s.agents)
  const reviews = useReviewStore((s) => s.reviews)
  const rooms = useChatStore((s) => s.rooms)
  const activities = useActivityStore((s) => s.activities)

  const completedReviews = reviews.filter((r) => r.status === 'completed')
  const recentReviews = completedReviews.slice(0, 5)
  const agentRanking = [...agents].sort((a, b) => b.usage_count - a.usage_count).slice(0, 5)

  return (
    <div className="space-y-6 animate-slide-up">
      <OnboardingGuide />

      {/* Compact Welcome */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
        <div>
          <h1 className="text-xl font-bold">你好，{user?.name || '用户'}</h1>
          <p className="mt-0.5 text-sm text-white/80">让教研评审团帮你发现教学设计的改进空间</p>
        </div>
      </div>

      {/* 4 Quick Actions - Main Area */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">快捷操作</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                to={action.path}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 no-underline"
              >
                <div className={`mb-4 inline-flex rounded-xl p-3 ${action.color} w-fit`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{action.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{action.desc}</p>
                <div className="mt-auto pt-4 flex items-center text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  开始 <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className="flex gap-3 overflow-x-auto">
        {[
          { label: '文档', value: documents.length, sub: `${documents.filter((d) => d.status === 'ready').length} 就绪`, icon: FileText },
          { label: '角色', value: agents.length, sub: `${agents.filter((a) => a.source === 'template').length} 模板`, icon: Bot },
          { label: '评审', value: reviews.length, sub: `${completedReviews.length} 完成`, icon: ClipboardCheck },
          { label: '研讨', value: rooms.length, sub: `${rooms.filter((r) => r.status === 'active').length} 活跃`, icon: MessageCircle },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-sm shrink-0">
              <div className="rounded-md bg-primary-50 p-1.5">
                <Icon className="h-3.5 w-3.5 text-primary-600" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-gray-900">{stat.value}</span>
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className="text-[10px] text-gray-400">{stat.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Agent Ranking + Recent Reviews */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Agent Usage Ranking */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900">角色使用排行</h2>
          </div>
          {agentRanking.length === 0 ? (
            <div className="py-8 text-center">
              <Bot className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-xs text-gray-500">暂无使用数据</p>
              <p className="text-[10px] text-gray-400 mt-1">发起评审后角色使用排行会显示在这里</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {agentRanking.map((agent, i) => {
                const borderColor = AGENT_COLORS[agent.color]
                return (
                  <div key={agent.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                    <span className={cn(
                      'text-xs font-bold w-5 text-center',
                      i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-300'
                    )}>
                      {i + 1}
                    </span>
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-sm shrink-0"
                      style={{ backgroundColor: borderColor + '15', boxShadow: `0 0 0 1.5px ${borderColor}` }}
                    >
                      {agent.avatar || agent.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{agent.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="h-3 w-3 text-amber-400" />
                      <span>{agent.usage_count} 次</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">最近评审</h2>
          </div>
          {recentReviews.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardCheck className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-xs text-gray-500">暂无评审记录</p>
              <p className="text-[10px] text-gray-400 mt-1">发起评审后记录会显示在这里</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentReviews.map((review) => (
                <div key={review.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="rounded-md bg-emerald-50 p-1.5 shrink-0">
                    <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {review.document?.title || '未命名文档'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {review.agent_reviews?.length || 0} 位角色参与
                    </p>
                  </div>
                  {review.overall_score != null && (
                    <div className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-bold',
                      review.overall_score >= 8 ? 'bg-emerald-50 text-emerald-600' :
                      review.overall_score >= 6 ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    )}>
                      {review.overall_score.toFixed(1)}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400 shrink-0">{formatTimeAgo(review.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity - compact */}
      {activities.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">最近动态</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activities.slice(0, 6).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[activity.type]}`} />
                  <span className="text-xs text-gray-700">{activity.text}</span>
                  {activity.score != null && (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                      {activity.score.toFixed(1)} 分
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{formatTimeAgo(activity.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
