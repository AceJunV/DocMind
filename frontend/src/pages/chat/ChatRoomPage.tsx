import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, UserPlus, FileText, MessageCircle, X, Trash2 } from 'lucide-react'
import { TypingIndicator } from '@/components/ui/TypingIndicator'
import { AGENT_COLORS, useAgentStore } from '@/stores/agentStore'
import { useChatStore } from '@/stores/chatStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/authStore'
import { chatCompletion } from '@/services/llmService'
import { isModelConfigValid, useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { createId } from '@/utils/id'
import type { ChatMessage, Agent } from '@/types'

const EMPTY_MESSAGES: ChatMessage[] = []

function randomDelay(min: number, max: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, min + Math.random() * (max - min)))
}

function buildChatSystemPrompt(agent: Agent, docContext: string, otherAgents: Agent[]): string {
  const othersDesc = otherAgents.length > 0
    ? `\n\n群里还有：${otherAgents.map((a) => `${a.name}（${a.tagline}）`).join('、')}。你可以直接回应他们的观点，叫他们的名字。`
    : ''
  return `${agent.system_prompt}${othersDesc}${docContext}\n\n记住：你现在在一个群聊里讨论。回复要短，像微信群聊一样，2-5句话。不要写长篇大论。`
}

export default function ChatRoomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const room = useChatStore((s) => s.rooms.find((r) => r.id === id))
  const messagesMap = useChatStore((s) => s.messages)
  const messages = messagesMap[id || ''] || EMPTY_MESSAGES
  const addMessage = useChatStore((s) => s.addMessage)
  const addParticipant = useChatStore((s) => s.addParticipant)
  const closeRoom = useChatStore((s) => s.closeRoom)
  const removeRoom = useChatStore((s) => s.removeRoom)
  const allAgents = useAgentStore((s) => s.agents)
  const allDocuments = useDocumentStore((s) => s.documents)
  const doc = useMemo(() => room?.document_id ? allDocuments.find((d) => d.id === room.document_id) : null, [allDocuments, room])
  const config = useSettingsStore((s) => s.currentConfig)
  const hasValidConfig = isModelConfigValid(config)

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [typingAgentIds, setTypingAgentIds] = useState<string[]>([])
  const [showDoc, setShowDoc] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const autoStartedRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const participants = room?.participants || []

  const docContext = useMemo(() => {
    if (!doc?.raw_content) return ''
    return `\n\n【正在讨论的文档】标题：《${doc.title}》\n内容摘要：\n${doc.raw_content.slice(0, 5000)}`
  }, [doc])

  const getAgentReply = useCallback(async (
    agent: Agent,
    contextMsgs: { role: 'user' | 'assistant' | 'system'; content: string }[],
    signal?: AbortSignal,
  ): Promise<string> => {
    const otherAgents = participants.filter((p) => p.id !== agent.id)
    const systemPrompt = buildChatSystemPrompt(agent, docContext, otherAgents)

    return new Promise<string>((resolve) => {
      let fullText = ''
      chatCompletion(
        [{ role: 'system', content: systemPrompt }, ...contextMsgs],
        {
          onChunk: (chunk) => { fullText += chunk },
          onDone: (text) => resolve(text),
          onError: () => resolve(fullText || '…'),
        },
        signal,
      ).catch(() => resolve(fullText || '…'))
    })
  }, [participants, docContext])

  const addAgentMsg = useCallback((agent: Agent, content: string) => {
    if (!id) return
    addMessage(id, {
      id: createId(),
      room_id: id,
      sender_type: 'agent',
      sender_id: agent.id,
      sender_name: agent.name,
      sender_color: agent.color,
      content,
      created_at: new Date().toISOString(),
    })
  }, [id, addMessage])

  // Auto-start: Agents greet & discuss when entering a room with doc context
  useEffect(() => {
    if (!id || !room || autoStartedRef.current || !hasValidConfig) return
    if (participants.length === 0) return
    // Only auto-start if there are very few messages (new room)
    const existingMessages = messagesMap[id] || []
    const agentMessages = existingMessages.filter((m) => m.sender_type === 'agent' && m.sender_id !== 'system')
    if (agentMessages.length > 0) {
      autoStartedRef.current = true
      return
    }
    autoStartedRef.current = true

    const controller = new AbortController()
    abortRef.current = controller

    const runAutoDiscussion = async () => {
      setLoading(true)
      const contextHistory: { role: 'user' | 'assistant'; content: string }[] = []

      for (let i = 0; i < Math.min(participants.length, 3); i++) {
        const agent = participants[i]
        if (controller.signal.aborted) break

        await randomDelay(800, 2000)

        let prompt: string
        if (i === 0) {
          prompt = doc
            ? `你刚加入一个讨论群，大家要一起讨论文档《${doc.title}》。先简短打个招呼，然后说说你读完这个文档的第一反应和主要观点。记住像真人在群里发消息一样，简短自然。`
            : `你刚加入一个讨论群，主题是"${room.topic}"。简短打个招呼，说说你对这个话题的看法。像真人在群里发消息一样。`
        } else {
          const prevMessages = contextHistory.map((m) => m.content).join('\n')
          prompt = `群里已经有人说了：\n${prevMessages}\n\n现在轮到你发言了。对前面的观点给出你的真实看法——同意的说同意，不同意的就反驳。${doc ? '结合文档内容说。' : ''}像真人在群里一样简短回复。`
        }

        const reply = await getAgentReply(
          agent,
          [...contextHistory, { role: 'user', content: prompt }],
          controller.signal,
        )

        if (reply && !controller.signal.aborted) {
          addAgentMsg(agent, reply)
          contextHistory.push({ role: 'assistant', content: `[${agent.name}]: ${reply}` })
        }
      }
      setLoading(false)
    }

    runAutoDiscussion()
    return () => { controller.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!room) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Link to="/chat" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-underline">
          <ArrowLeft className="h-4 w-4" /> 返回聊天室列表
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">聊天室不存在</p>
          <Link to="/chat" className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 no-underline">
            返回列表
          </Link>
        </div>
      </div>
    )
  }

  const parseTargetAgent = (text: string): { targetAgent: Agent | undefined; cleanText: string } => {
    const match = text.match(/^@(\S+)\s+/)
    if (!match) return { targetAgent: undefined, cleanText: text }
    const name = match[1]
    const agent = participants.find((p) => p.name === name)
    return { targetAgent: agent, cleanText: text.slice(match[0].length) }
  }

  const handleSend = async () => {
    if (!input.trim() || loading || !id) return
    const text = input.trim()
    setInput('')

    const { targetAgent, cleanText } = parseTargetAgent(text)

    const userMsg: ChatMessage = {
      id: createId(),
      room_id: id,
      sender_type: 'user',
      sender_id: user?.id || '',
      sender_name: user?.name || '我',
      content: text,
      target_agent_id: targetAgent?.id,
      created_at: new Date().toISOString(),
    }
    addMessage(id, userMsg)

    if (!hasValidConfig) {
      addMessage(id, {
        id: createId(), room_id: id, sender_type: 'agent',
        sender_id: 'system', sender_name: '系统',
        content: '请先到设置页面配置 API Key 才能与角色对话。',
        created_at: new Date().toISOString(),
      })
      return
    }

    setLoading(true)
    const controller = new AbortController()
    abortRef.current = controller

    // Build conversation context from recent messages
    const recentMessages = messages.slice(-12)
    const contextHistory: { role: 'user' | 'assistant'; content: string }[] = recentMessages.map((m) => ({
      role: (m.sender_type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.sender_type === 'agent' && m.sender_id !== 'system' ? `[${m.sender_name}]: ${m.content}` : m.content,
    }))

    if (targetAgent) {
      setTypingAgentIds([targetAgent.id])
      const reply = await getAgentReply(
        targetAgent,
        [...contextHistory, { role: 'user', content: cleanText }],
        controller.signal,
      )
      setTypingAgentIds([])
      if (reply && !controller.signal.aborted) {
        addAgentMsg(targetAgent, reply)
      }
    } else {
      const numResponders = Math.min(participants.length, Math.random() > 0.4 ? 2 : (participants.length >= 3 ? 3 : participants.length))
      const shuffled = [...participants].sort(() => Math.random() - 0.5)
      const responders = shuffled.slice(0, numResponders)

      const runningContext = [...contextHistory, { role: 'user' as const, content: cleanText }]

      for (let i = 0; i < responders.length; i++) {
        const agent = responders[i]
        if (controller.signal.aborted) break

        setTypingAgentIds([agent.id])
        if (i > 0) await randomDelay(1200, 3000)

        const reply = await getAgentReply(
          agent,
          [...runningContext],
          controller.signal,
        )

        setTypingAgentIds([])
        if (reply && !controller.signal.aborted) {
          addAgentMsg(agent, reply)
          runningContext.push({ role: 'assistant' as const, content: `[${agent.name}]: ${reply}` })
        }
      }
    }

    setLoading(false)
  }

  const handleInvite = async (agent: Agent) => {
    if (!id) return
    addParticipant(id, agent)
    setShowInvite(false)
    toast('success', `已邀请「${agent.name}」加入聊天室`)

    addMessage(id, {
      id: createId(), room_id: id, sender_type: 'agent',
      sender_id: 'system', sender_name: '系统',
      content: `${agent.avatar || ''} ${agent.name} 加入了聊天室`,
      created_at: new Date().toISOString(),
    })

    // New agent introduces themselves
    if (hasValidConfig) {
      setLoading(true)
      const controller = new AbortController()
      abortRef.current = controller

      await randomDelay(1000, 2500)

      const recentContext = messages.slice(-6).map((m) => ({
        role: (m.sender_type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.sender_type === 'agent' && m.sender_id !== 'system' ? `[${m.sender_name}]: ${m.content}` : m.content,
      }))

      const greeting = doc
        ? `你刚被邀请加入一个讨论群，大家在讨论文档《${doc.title}》。群里之前已经聊了一些了。简短打个招呼，然后对之前的讨论或文档说几句你的看法。像真人进群一样自然。`
        : `你刚被邀请加入一个讨论群，主题是"${room.topic}"。之前已经有一些讨论了。简短打个招呼，说说你的看法。`

      const reply = await getAgentReply(
        agent,
        [...recentContext, { role: 'user', content: greeting }],
        controller.signal,
      )

      if (reply && !controller.signal.aborted) {
        addAgentMsg(agent, reply)
      }
      setLoading(false)
    }
  }

  const availableToInvite = allAgents.filter((a) => !participants.some((p) => p.id === a.id))

  return (
    <div className="animate-slide-up" style={{ height: 'calc(100vh - 112px)' }}>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/chat" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-underline">
          <ArrowLeft className="h-4 w-4" /> 返回聊天室列表
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer bg-white"
          >
            <UserPlus className="h-3.5 w-3.5" /> 邀请角色
          </button>
          {room.status === 'active' && (
            <button
              onClick={() => setConfirmClose(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer bg-white"
            >
              关闭聊天室
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer bg-white"
          >
            <Trash2 className="h-3 w-3" /> 删除
          </button>
          <ConfirmDialog
            open={confirmDelete}
            title="确认删除聊天室"
            description={`确定要删除「${room.topic}」吗？所有消息记录将被永久删除。`}
            confirmText="删除"
            variant="danger"
            onConfirm={() => { removeRoom(id!); navigate('/chat'); toast('success', '聊天室已删除') }}
            onCancel={() => setConfirmDelete(false)}
          />
          <ConfirmDialog
            open={confirmClose}
            title="关闭聊天室"
            description="关闭后角色将不再回复消息，但历史记录会保留。确定要关闭吗？"
            confirmText="关闭"
            onConfirm={() => { closeRoom(id!); setConfirmClose(false); toast('info', '聊天室已关闭') }}
            onCancel={() => setConfirmClose(false)}
          />
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowInvite(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">邀请角色</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            {availableToInvite.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">没有更多可邀请的角色</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableToInvite.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleInvite(agent)}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 cursor-pointer bg-white transition-colors"
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: AGENT_COLORS[agent.color] + '15' }}
                    >
                      {agent.avatar || agent.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.tagline}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-4 h-full">
        {showDoc && doc && (
          <div className="hidden lg:flex w-72 shrink-0 flex-col gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
                <FileText className="h-4 w-4 text-primary-500" /> 文档预览
              </h3>
              <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
                <p className="font-medium text-gray-800">{doc.title}</p>
                <div className="rounded-lg bg-primary-50 border border-primary-100 p-2.5 text-xs">
                  {doc.raw_content?.slice(0, 300)}...
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">参与者</h3>
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: AGENT_COLORS[p.color] + '15' }}
                    >
                      {p.avatar || p.name[0]}
                    </div>
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col min-w-0">
          <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{room.topic}</h3>
              <p className="text-xs text-gray-500">{messages.length} 条消息 · {participants.length} 位角色</p>
            </div>
            <button
              onClick={() => setShowDoc(!showDoc)}
              className="lg:hidden text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => {
              if (msg.sender_type === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[70%] rounded-xl rounded-tr-sm bg-gray-100 px-4 py-2.5 text-sm text-gray-700 whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                )
              }

              if (!msg.sender_color) {
                return (
                  <div key={msg.id} className="rounded-xl bg-primary-50 border border-primary-100 px-4 py-3 text-sm text-gray-600 whitespace-pre-wrap text-center">
                    {msg.content}
                  </div>
                )
              }

              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[75%]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                        style={{ backgroundColor: AGENT_COLORS[msg.sender_color] + '15' }}
                      >
                        {participants.find((p) => p.id === msg.sender_id)?.avatar || msg.sender_name[0]}
                      </div>
                      <span className="text-xs font-medium" style={{ color: AGENT_COLORS[msg.sender_color] }}>{msg.sender_name}</span>
                      <span className="text-xs text-gray-400 ml-1">
                        {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div
                      className="rounded-xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-700 whitespace-pre-wrap border-l-2"
                      style={{ backgroundColor: AGENT_COLORS[msg.sender_color] + '08', borderLeftColor: AGENT_COLORS[msg.sender_color] }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}

            {loading && (
              <TypingIndicator
                agents={typingAgentIds.length > 0
                  ? participants.filter((p) => typingAgentIds.includes(p.id))
                  : participants.slice(0, 1)}
              />
            )}
          </div>

          <div className="border-t border-gray-100 p-4">
            {room.status === 'closed' ? (
              <p className="text-sm text-gray-500 text-center">此聊天室已关闭</p>
            ) : (
              <div className="relative">
                {mentionQuery !== null && (() => {
                  const filtered = participants.filter((p) =>
                    !mentionQuery || p.name.toLowerCase().includes(mentionQuery.toLowerCase())
                  )
                  if (filtered.length === 0) return null
                  return (
                    <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-20">
                      {filtered.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            const atIndex = input.lastIndexOf('@')
                            const before = input.slice(0, atIndex)
                            setInput(`${before}@${p.name} `)
                            setMentionQuery(null)
                            inputRef.current?.focus()
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer border-0 bg-transparent"
                        >
                          <div
                            className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                            style={{ backgroundColor: AGENT_COLORS[p.color] + '15' }}
                          >
                            {p.avatar || p.name[0]}
                          </div>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )
                })()}
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => {
                      const val = e.target.value
                      setInput(val)
                      const atIndex = val.lastIndexOf('@')
                      if (atIndex >= 0 && (atIndex === 0 || val[atIndex - 1] === ' ')) {
                        const query = val.slice(atIndex + 1)
                        if (!query.includes(' ')) {
                          setMentionQuery(query)
                        } else {
                          setMentionQuery(null)
                        }
                      } else {
                        setMentionQuery(null)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setMentionQuery(null); return }
                      if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) handleSend()
                    }}
                    placeholder={`输入消息... 用 @ 提及某人`}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="rounded-lg bg-primary-600 px-4 py-2.5 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
