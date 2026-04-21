import { Link } from 'react-router-dom'
import { OnboardingGuide } from '@/components/ui/OnboardingGuide'
import { useAuthStore } from '@/stores/authStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useAgentStore } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useChatStore } from '@/stores/chatStore'
import { useActivityStore, type Activity } from '@/stores/activityStore'
import {
  FileText, Bot, ClipboardCheck, MessageCircle,
  Upload, Plus, ArrowRight, TrendingUp, Clock,
} from 'lucide-react'

const QUICK_ACTIONS = [
  { icon: Upload, label: '上传文档', desc: '支持 PDF/Word/MD/TXT', path: '/documents', color: 'bg-blue-50 text-blue-600' },
  { icon: Plus, label: '创建 Agent', desc: '定制你的评审角色', path: '/agents', color: 'bg-purple-50 text-purple-600' },
  { icon: ClipboardCheck, label: '发起评审', desc: '多角色并行评审', path: '/reviews', color: 'bg-emerald-50 text-emerald-600' },
  { icon: MessageCircle, label: '进入聊天室', desc: '与 Agent 深度辩论', path: '/chat', color: 'bg-orange-50 text-orange-600' },
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

  const stats = [
    { label: '文档总数', value: documents.length, icon: FileText, trend: `${documents.filter((d) => d.status === 'ready').length} 已就绪`, cta: { label: '上传第一个文档', path: '/documents' } },
    { label: 'Agent 数量', value: agents.length, icon: Bot, trend: `${agents.filter((a) => a.source === 'template').length} 来自模板`, cta: { label: '添加第一个 Agent', path: '/agents' } },
    { label: '评审次数', value: reviews.length, icon: ClipboardCheck, trend: `${reviews.filter((r) => r.status === 'completed').length} 已完成`, cta: { label: '发起第一次评审', path: '/reviews/create' } },
    { label: '聊天室', value: rooms.length, icon: MessageCircle, trend: `${rooms.filter((r) => r.status === 'active').length} 活跃中`, cta: { label: '创建聊天室', path: '/chat' } },
  ]

  return (
    <div className="space-y-6 animate-slide-up">
      <OnboardingGuide />
      <div className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
        <h1 className="text-2xl font-bold">
          你好，{user?.name || '用户'}
        </h1>
        <p className="mt-1 text-white/80">
          欢迎回到 DocMind，让 AI 评审团帮你发现更多盲区
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-lg bg-primary-50 p-2">
                  <Icon className="h-5 w-5 text-primary-600" />
                </div>
                {stat.value > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
              {stat.value === 0 && stat.cta && (
                <Link to={stat.cta.path} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-600 no-underline hover:underline">
                  {stat.cta.label} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">快捷操作</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                to={action.path}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 no-underline"
              >
                <div className={`mb-3 inline-flex rounded-lg p-2.5 ${action.color} w-fit`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{action.label}</h3>
                <p className="text-xs text-gray-500">{action.desc}</p>
                <div className="mt-auto pt-3 flex items-center text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  开始 <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">最近动态</h2>
        </div>
        {activities.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">暂无动态</p>
            <p className="text-xs text-gray-400 mt-1">开始上传文档或创建 Agent 吧</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activities.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${TYPE_DOT[activity.type]}`} />
                  <span className="text-sm text-gray-700">{activity.text}</span>
                  {activity.score != null && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                      {activity.score.toFixed(1)} 分
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(activity.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
