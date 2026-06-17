import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Check, FileText, Search, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENT_COLORS } from '@/stores/agentStore'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useAgentStore } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { toast } from '@/components/ui/Toast'
import { createId } from '@/utils/id'
import { DEFAULT_CHAT_ROOM_STRATEGY } from '@/types'
import { useReviewBookmarkStore } from '@/stores/reviewBookmarkStore'
import { formatDateTime } from '@/utils/format'
import type { ChatRoom, ChatAgendaItem, DiscussionMode, ContextDepth, InitiativeLevel, ConflictLevel, RoomTone, FeedbackLevel, Review } from '@/types'

const CONTEXT_DEPTH_OPTIONS: Array<{ value: ContextDepth; label: string }> = [
  { value: 'fast', label: '快速' },
  { value: 'deep', label: '深度' },
  { value: 'long-document', label: '长文档' },
]

const INITIATIVE_OPTIONS: Array<{ value: InitiativeLevel; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'standard', label: '标准' },
  { value: 'high', label: '高' },
]

const CONFLICT_OPTIONS: Array<{ value: ConflictLevel; label: string }> = [
  { value: 'soft', label: '温和' },
  { value: 'balanced', label: '平衡' },
  { value: 'intense', label: '激烈' },
]

const ROOM_TONE_OPTIONS: Array<{ value: RoomTone; label: string }> = [
  { value: 'review-meeting', label: '专业评审会' },
  { value: 'brainstorm', label: '热烈头脑风暴' },
  { value: 'teaching-seminar', label: '教学研讨课堂' },
  { value: 'product-review', label: '产品评审会' },
]

const FEEDBACK_OPTIONS: Array<{ value: FeedbackLevel; label: string }> = [
  { value: 'simple', label: '简洁' },
  { value: 'full', label: '完整' },
]

interface Props {
  review?: Review | null
  initialTopic?: string
  initialAgentIds?: string[]
  initialDiscussionMode?: DiscussionMode
  agendaText?: string
  onClose: () => void
}

export default function ChatRoomConfigModal({
  review,
  initialTopic = '',
  initialAgentIds = [],
  initialDiscussionMode = 'free',
  agendaText,
  onClose,
}: Props) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const createRoom = useChatStore((s) => s.createRoom)
  const addMessage = useChatStore((s) => s.addMessage)
  const markAsDiscussed = useReviewBookmarkStore((s) => s.markAsDiscussed)
  const agents = useAgentStore((s) => s.agents)
  const tempAgents = useAgentStore((s) => s.tempAgents)
  const templates = useAgentStore((s) => s.templates)
  const templateVisibility = useAgentStore((s) => s.templateVisibility)

  const visibleAgents = useMemo(() => [...agents, ...tempAgents].filter((a) => a.visibleInReview !== false), [agents, tempAgents])
  const visibleTemplates = useMemo(
    () => templates.filter((t) => templateVisibility[t.id] !== false),
    [templates, templateVisibility]
  )

  const reviews = useReviewStore((s) => s.reviews)
  const completedReviews = useMemo(
    () => reviews.filter((r) => r.status === 'completed'),
    [reviews]
  )

  const [newTopic, setNewTopic] = useState(initialTopic)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(initialAgentIds)
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>(initialDiscussionMode)
  const [contextDepth, setContextDepth] = useState<ContextDepth>(DEFAULT_CHAT_ROOM_STRATEGY.contextDepth)
  const [initiativeLevel, setInitiativeLevel] = useState<InitiativeLevel>(DEFAULT_CHAT_ROOM_STRATEGY.initiativeLevel)
  const [conflictLevel, setConflictLevel] = useState<ConflictLevel>(DEFAULT_CHAT_ROOM_STRATEGY.conflictLevel)
  const [roomTone, setRoomTone] = useState<RoomTone>(DEFAULT_CHAT_ROOM_STRATEGY.roomTone)
  const [feedbackLevel, setFeedbackLevel] = useState<FeedbackLevel>(DEFAULT_CHAT_ROOM_STRATEGY.feedbackLevel)
  const [showDocDrawer, setShowDocDrawer] = useState(false)
  const [docSearch, setDocSearch] = useState('')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)

  const filteredReviews = useMemo(() => {
    if (!docSearch.trim()) return completedReviews
    const keyword = docSearch.trim().toLowerCase()
    return completedReviews.filter((r) =>
      (r.document?.title || '').toLowerCase().includes(keyword)
    )
  }, [completedReviews, docSearch])

  const toggleAgentSelect = (id: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleCreateRoom = () => {
    const topic = newTopic.trim()
    if (!topic) {
      toast('info', '请填写研讨主题')
      return
    }
    if (selectedAgentIds.length === 0) {
      toast('info', '请至少选择一个角色')
      return
    }
    const effectiveReview = review || selectedReview
    const modeLabel = discussionMode === 'debate' ? '辩论' : discussionMode === 'moderated' ? '引导' : '自由'
    const strategy = {
      ...DEFAULT_CHAT_ROOM_STRATEGY,
      discussionMode,
      contextDepth,
      initiativeLevel,
      conflictLevel,
      roomTone,
      feedbackLevel,
    }
    const participants = selectedAgentIds
      .map((id) => {
        if (id.startsWith('tpl-')) {
          const tpl = templates.find((t) => t.id === id.slice(4))
          if (tpl) {
            return {
              id: `tpl-${tpl.id}`,
              name: tpl.name,
              avatar: tpl.avatar,
              tagline: tpl.tagline,
              color: tpl.color,
              system_prompt: tpl.systemPrompt || '',
              personality: tpl.personality || { directness: 0.5, strictness: 0.5, empathy: 0.5, humor: 0.5 },
              expertise: tpl.expertise || [],
              behavior: tpl.behavior || { style: '' },
              category: tpl.category,
              focusDimension: tpl.focusDimension,
            } as const
          }
        }
        const agent = agents.find((a) => a.id === id) ?? tempAgents.find((a) => a.id === id)
        return agent
          ? {
              id: agent.id,
              name: agent.name,
              avatar: agent.avatar,
              tagline: agent.tagline,
              color: agent.color,
              expertise: agent.expertise || [],
              system_prompt: agent.system_prompt || '',
              category: agent.category,
              focusDimension: agent.focusDimension,
              personality: agent.personality || { directness: 0.5, strictness: 0.5, empathy: 0.5, humor: 0.5 },
              behavior: agent.behavior || { style: '' },
            }
          : null
      })
      .filter(Boolean)

    const room: ChatRoom = {
      id: createId(),
      document_id: effectiveReview?.document_id || '',
      review_id: effectiveReview?.id,
      owner_id: user?.id || '',
      topic,
      status: 'active',
      participants,
      discussionMode,
      strategy,
      discussionState: 'idle',
      topicTags: effectiveReview
        ? [
            ...(effectiveReview.summary?.pain_points || []),
            ...(effectiveReview.summary?.top_suggestions?.map((item) => item.title || item.content) || []),
          ].slice(0, 5)
        : undefined,
      bookmarkAgenda: agendaText || undefined,
      pendingTopics: agendaText
        ? agendaText.split('\n').filter(Boolean).map((line) => ({
            id: `agenda-${createId()}`,
            text: line.replace(/^[^\s]+\s/, '').replace(/^[^：]+：/, ''),
            source: 'user' as const,
            priority: 5,
            status: 'pending' as ChatAgendaItem['status'],
          }))
        : undefined,
      created_at: new Date().toISOString(),
    }
    createRoom(room)
    addMessage(room.id, {
      id: createId(),
      room_id: room.id,
      sender_type: 'agent',
      sender_id: 'system',
      sender_name: '系统',
      content:
        discussionMode === 'free'
          ? `研讨室已建好（${modeLabel}讨论模式）。${participants.map((a) => `${a.avatar || ''} ${a.name}`).join('、')} 已加入。\n你先说一句想聊什么，角色会优先接住你的话题。`
          : effectiveReview
            ? `讨论群已建好（${modeLabel}讨论模式）。${participants.map((a) => `${a.avatar || ''} ${a.name}`).join('、')} 已加入。\n角色们正在阅读评审报告，稍后会围绕共识、分歧和建议展开讨论。`
            : `讨论群已建好（${modeLabel}讨论模式）。${participants.map((a) => `${a.avatar || ''} ${a.name}`).join('、')} 已加入，大家正在热身中...`,
      created_at: new Date().toISOString(),
    })
    if (agendaText && effectiveReview?.id) {
      markAsDiscussed(effectiveReview.id)
    }
    onClose()
    const from = effectiveReview ? `/reviews/${effectiveReview.id}` : '/chat'
    navigate(`/chat/${room.id}`, { state: { from } })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative mx-4" onClick={(e) => e.stopPropagation()}>
        <div
          className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl animate-slide-up"
          style={{ borderTopRightRadius: showDocDrawer ? 0 : undefined, borderBottomRightRadius: showDocDrawer ? 0 : undefined }}
        >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {review ? '配置教研研讨' : '新增研讨室'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">讨论主题</label>
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="例如：关于方案可行性的讨论"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          {!review && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">选择研讨文档</label>
              {selectedReview ? (
                <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                    <span className="text-sm text-primary-700 truncate">{selectedReview.document?.title || '未命名文档'}</span>
                  </div>
                  <button
                    onClick={() => setShowDocDrawer(true)}
                    className="text-xs text-primary-600 hover:text-primary-800 cursor-pointer border-0 bg-transparent shrink-0 ml-2"
                  >
                    更换
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDocDrawer(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  点击选择已评审的文档
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">讨论模式</label>
            <div className="flex gap-2">
              {[
                { value: 'free' as DiscussionMode, label: '💬 自由讨论', desc: '自然发言' },
                { value: 'moderated' as DiscussionMode, label: '📋 引导式', desc: '围绕主题' },
                { value: 'debate' as DiscussionMode, label: '⚔️ 辩论', desc: '观点对抗' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDiscussionMode(opt.value)}
                  className={cn(
                    'flex-1 rounded-lg border p-2 text-center text-xs transition-colors cursor-pointer',
                    discussionMode === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">上下文深度</label>
              <select
                value={contextDepth}
                onChange={(event) => setContextDepth(event.target.value as ContextDepth)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                {CONTEXT_DEPTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">产品气质</label>
              <select
                value={roomTone}
                onChange={(event) => setRoomTone(event.target.value as RoomTone)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                {ROOM_TONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">主动性</label>
              <div className="grid grid-cols-3 gap-1.5">
                {INITIATIVE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setInitiativeLevel(option.value)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-xs font-medium transition-colors cursor-pointer',
                      initiativeLevel === option.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">冲突强度</label>
              <div className="grid grid-cols-3 gap-1.5">
                {CONFLICT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setConflictLevel(option.value)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-xs font-medium transition-colors cursor-pointer',
                      conflictLevel === option.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">过程反馈</label>
              <div className="grid grid-cols-2 gap-1.5">
                {FEEDBACK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFeedbackLevel(option.value)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-xs font-medium transition-colors cursor-pointer',
                      feedbackLevel === option.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              原文引用可用但不强制；身份边界默认按角色能力自动约束。
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              选择参与的角色 ({selectedAgentIds.length}/{visibleTemplates.length + visibleAgents.length})
            </label>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {visibleTemplates.length === 0 && visibleAgents.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">请先在角色工坊中添加角色</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {visibleTemplates.length > 0 && (
                    <>
                      <div className="col-span-2 flex items-center gap-2 py-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                          预设角色
                        </span>
                      </div>
                      {visibleTemplates.map((tpl) => {
                        const tplId = `tpl-${tpl.id}`
                        const isSelected = selectedAgentIds.includes(tplId)
                        const color = AGENT_COLORS[tpl.color]
                        return (
                          <button
                            key={tplId}
                            onClick={() => toggleAgentSelect(tplId)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors cursor-pointer',
                              isSelected ? 'border-primary-500 bg-primary-50' : 'border-transparent hover:bg-gray-50'
                            )}
                          >
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full text-sm shrink-0"
                              style={{
                                backgroundColor: color + '15',
                                boxShadow: isSelected ? `0 0 0 2px ${color}` : 'none',
                              }}
                            >
                              {tpl.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{tpl.name}</p>
                              <p className="text-xs text-gray-500 truncate">{tpl.tagline}</p>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary-600 shrink-0" />}
                          </button>
                        )
                      })}
                    </>
                  )}
                  {visibleTemplates.length > 0 && visibleAgents.length > 0 && (
                    <div className="col-span-2 flex items-center gap-2 py-1">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        我的角色
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  )}
                  {visibleAgents.map((agent) => {
                    const isSelected = selectedAgentIds.includes(agent.id)
                    return (
                      <button
                        key={agent.id}
                        onClick={() => toggleAgentSelect(agent.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors cursor-pointer',
                          isSelected ? 'border-primary-500 bg-primary-50' : 'border-transparent hover:bg-gray-50'
                        )}
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-sm shrink-0"
                          style={{
                            backgroundColor: AGENT_COLORS[agent.color] + '15',
                            boxShadow: isSelected ? `0 0 0 2px ${AGENT_COLORS[agent.color]}` : 'none',
                          }}
                        >
                          {agent.avatar || agent.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                          <p className="text-xs text-gray-500 truncate">{agent.tagline}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary-600 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={selectedAgentIds.length === 0 || !newTopic.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer border-0"
          >
            创建
          </button>
        </div>
      </div>

      {/* Document selection drawer - positioned to the right of modal */}
      {showDocDrawer && (
        <div className="absolute left-full top-0 bottom-0 w-72 flex flex-col rounded-r-xl border-l border-gray-200 bg-white shadow-xl animate-slide-in-right">
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
            <button
              onClick={() => { setShowDocDrawer(false); setDocSearch('') }}
              className="text-gray-500 hover:text-gray-700 cursor-pointer border-0 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h4 className="text-sm font-semibold text-gray-900">选择研讨文档</h4>
          </div>
          <div className="px-3 py-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="搜索文档标题"
                className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                autoFocus
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {filteredReviews.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">暂无已评审的文档</div>
            ) : (
              <div className="space-y-1.5">
                {filteredReviews.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedReview(r)
                      setNewTopic(`关于《${r.document?.title || '文档'}》的评审讨论`)
                      setShowDocDrawer(false)
                      setDocSearch('')
                    }}
                    className={cn(
                      'w-full flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors cursor-pointer',
                      selectedReview?.id === r.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-100 hover:bg-gray-50'
                    )}
                  >
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.document?.title || '未命名文档'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(r.created_at)}</p>
                    </div>
                    {selectedReview?.id === r.id && <Check className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
