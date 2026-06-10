import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MessageCircle, Clock, Users, ArrowRight, Plus, MoreHorizontal, Trash2, XCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AGENT_COLORS } from '@/stores/agentStore'
import { useChatStore } from '@/stores/chatStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useAuthStore } from '@/stores/authStore'
import { useReviewBookmarkStore } from '@/stores/reviewBookmarkStore'
import { toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import ChatRoomConfigModal from '@/components/ui/ChatRoomConfigModal'
import { formatTimeAgo } from '@/utils/format'
import { BOOKMARK_CATEGORY_CONFIG } from '@/types'
import type { ChatRoom } from '@/types'

export default function ChatListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const reviewId = searchParams.get('review')
  const rooms = useChatStore((s) => s.rooms)
  const allMessages = useChatStore((s) => s.messages)
  const closeRoom = useChatStore((s) => s.closeRoom)
  const removeRoom = useChatStore((s) => s.removeRoom)
  const allReviews = useReviewStore((s) => s.reviews)
  const review = useMemo(() => reviewId ? allReviews.find((r) => r.id === reviewId) : null, [allReviews, reviewId])
  const bookmarkList = useReviewBookmarkStore((s) => (review?.id ? s.bookmarks[review.id] : undefined))
  const agendaText = useMemo(() => {
    if (!bookmarkList || bookmarkList.length === 0) return undefined
    const activeItems = bookmarkList.filter((b) => !b.discussed)
    if (activeItems.length === 0) return undefined
    return activeItems.map((b) => `${BOOKMARK_CATEGORY_CONFIG[b.category].icon} ${b.category}：${b.fullContent}`).join('\n')
  }, [bookmarkList])
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'closed'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChatRoom | null>(null)
  const [agendaTooltipId, setAgendaTooltipId] = useState<string | null>(null)
  const handledReviewRef = useRef<string | null>(null)

  useEffect(() => {
    if (!reviewId || !review || review.status !== 'completed') return
    if (handledReviewRef.current === reviewId) return
    handledReviewRef.current = reviewId

    const existingRoom = rooms.find((r) => r.review_id === reviewId)
    if (existingRoom) {
      navigate(`/chat/${existingRoom.id}`, { replace: true })
      return
    }

    setShowCreateModal(true)
  }, [reviewId, review, rooms, navigate])

  // Click-outside to close menu
  useEffect(() => {
    if (!menuOpenId) return
    const handler = () => setMenuOpenId(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

  const filteredRooms = useMemo(
    () => rooms.filter((r) => activeTab === 'all' ? true : r.status === activeTab),
    [rooms, activeTab]
  )

  const handleCloseRoom = (room: ChatRoom) => {
    closeRoom(room.id)
    toast('info', `已关闭「${room.topic}」`)
    setMenuOpenId(null)
  }

  const handleDeleteRoom = (room: ChatRoom) => {
    removeRoom(room.id)
    toast('success', `已删除研讨室「${room.topic}」`)
    setDeleteTarget(null)
    setMenuOpenId(null)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">研讨室</h1>
          <p className="text-sm text-gray-500 mt-1">与 AI 角色深度辩论，碰撞出更好的想法</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors cursor-pointer border-0"
        >
          <Plus className="h-4 w-4" />
          新增研讨室
        </button>
      </div>

      <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 w-fit">
        {[
          { key: 'all' as const, label: `全部 (${rooms.length})` },
          { key: 'active' as const, label: '活跃中' },
          { key: 'closed' as const, label: '已结束' },
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

      {filteredRooms.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {rooms.length === 0 ? '还没有研讨室' : '没有匹配的研讨室'}
          </p>
          <p className="text-sm text-gray-400 mt-1">完成评审后可以创建研讨室与角色深入讨论</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link to="/reviews" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 no-underline">
              查看评审
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 cursor-pointer border-0"
            >
              新增研讨室
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map((room) => {
            const roomMessages = allMessages[room.id] || []
            const lastMsg = roomMessages[roomMessages.length - 1]
            const lastTime = lastMsg ? lastMsg.created_at : room.created_at
            return (
              <div
                key={room.id}
                className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md group"
              >
                <Link to={`/chat/${room.id}`} className="absolute inset-0 z-0" />
                <div className="relative z-10 pointer-events-none">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900">{room.topic}</h3>
                        {room.discussionMode && room.discussionMode !== 'free' && (
                          <span className={cn(
                            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                            room.discussionMode === 'debate' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          )}>
                            {room.discussionMode === 'debate' ? '辩论' : '引导'}
                          </span>
                        )}
                        {(room.bookmarkAgenda || (room.pendingTopics && room.pendingTopics.length > 0)) && (
                          <span
                            className="relative pointer-events-auto"
                            onMouseEnter={() => setAgendaTooltipId(room.id)}
                            onMouseLeave={() => setAgendaTooltipId(null)}
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400 hover:text-primary-500 cursor-help" />
                            {agendaTooltipId === room.id && (
                              <span className="absolute left-full top-0 ml-2 z-50 w-80 max-h-48 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs text-gray-700 leading-relaxed pointer-events-auto">
                                <div className="animate-scroll-up">
                                  {(() => {
                                    const items = room.bookmarkAgenda
                                      ? room.bookmarkAgenda.split('\n')
                                      : room.pendingTopics?.map((t) => t.text) || []
                                    const lines = items.map((line, i) => <p key={i} className="flex gap-1.5"><span className="shrink-0 text-primary-600 font-medium">{i + 1}.</span><span>{line}</span></p>)
                                    return <>{lines}{lines}</>
                                  })()}
                                </div>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {roomMessages.length} 条消息
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        room.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                      )}>
                        {room.status === 'active' ? '活跃中' : '已结束'}
                      </span>
                      <div className="relative">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(menuOpenId === room.id ? null : room.id) }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer transition-opacity p-1 rounded-md hover:bg-gray-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpenId === room.id && (
                          <div
                            className="absolute right-0 top-7 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            {room.status === 'active' && (
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCloseRoom(room) }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-0 bg-transparent"
                              >
                                <XCircle className="h-3.5 w-3.5" /> 关闭研讨室
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(room); setMenuOpenId(null) }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer border-0 bg-transparent"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> 删除研讨室
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {room.participants.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <div className="flex -space-x-1">
                        {room.participants.map((p) => (
                          <div
                            key={p.id}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-xs border-2 border-white"
                            style={{ backgroundColor: AGENT_COLORS[p.color] + '25' }}
                            title={p.name}
                          >
                            {p.avatar || p.name[0]}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {room.participants.map((p) => p.name).join('、')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate max-w-md">
                      {lastMsg ? `${lastMsg.sender_name}: ${lastMsg.content.slice(0, 60)}` : '暂无消息'}
                    </p>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(lastTime)}
                      </span>
                      <span className="flex items-center text-xs font-medium text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        进入 <ArrowRight className="h-3 w-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="确认删除研讨室"
        description={deleteTarget ? `确定要删除「${deleteTarget.topic}」吗？所有消息记录将被永久删除，此操作不可撤销。` : ''}
        confirmText="删除"
        variant="danger"
        onConfirm={() => deleteTarget && handleDeleteRoom(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      {showCreateModal && (
        <ChatRoomConfigModal
          review={review}
          initialTopic={review ? `关于《${review.document?.title || '文档'}》的评审讨论` : ''}
          initialAgentIds={review?.agents?.map((a) => a.id) || []}
          initialDiscussionMode={review ? 'moderated' : 'free'}
          agendaText={agendaText}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
