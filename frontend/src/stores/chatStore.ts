import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatRoom, ChatMessage, ChatPoll, Bookmark, DiscussionSummary, Agent, MessageStatus } from '@/types'
import { useActivityStore } from './activityStore'

interface ChatState {
  rooms: ChatRoom[]
  messages: Record<string, ChatMessage[]>
  bookmarks: Bookmark[]
  polls: ChatPoll[]
  summaries: DiscussionSummary[]

  createRoom: (room: ChatRoom) => void
  closeRoom: (id: string) => void
  removeRoom: (id: string) => void
  getRoom: (id: string) => ChatRoom | undefined

  addMessage: (roomId: string, message: ChatMessage) => void
  updateMessageStatus: (roomId: string, messageId: string, status: MessageStatus) => void
  getMessages: (roomId: string) => ChatMessage[]

  addParticipant: (roomId: string, agent: Agent) => void

  addReaction: (roomId: string, messageId: string, emoji: string, isUser: boolean, agentId?: string) => void
  removeReaction: (roomId: string, messageId: string, emoji: string, isUser: boolean, agentId?: string) => void

  addBookmark: (bookmark: Bookmark) => void
  removeBookmark: (bookmarkId: string) => void

  createPoll: (poll: ChatPoll) => void
  castVote: (pollId: string, optionId: string, voterId: string) => void

  addSummary: (summary: DiscussionSummary) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      rooms: [],
      messages: {},
      bookmarks: [],
      polls: [],
      summaries: [],

      createRoom: (room) => {
        set((state) => ({
          rooms: [room, ...state.rooms],
          messages: { ...state.messages, [room.id]: [] },
        }))
        useActivityStore.getState().addActivity({
          type: 'chat',
          text: `创建了聊天室「${room.topic}」`,
        })
      },

      closeRoom: (id) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === id ? { ...r, status: 'closed' as const } : r
          ),
        }))
      },

      removeRoom: (id) => {
        set((state) => {
          const { [id]: _, ...restMessages } = state.messages
          return {
            rooms: state.rooms.filter((r) => r.id !== id),
            messages: restMessages,
          }
        })
      },

      getRoom: (id) => get().rooms.find((r) => r.id === id),

      addMessage: (roomId, message) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: [...(state.messages[roomId] || []), message],
          },
        }))
      },

      getMessages: (roomId) => get().messages[roomId] || [],

      addParticipant: (roomId, agent) => {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId && !r.participants.some((p) => p.id === agent.id)
              ? { ...r, participants: [...r.participants, agent] }
              : r
          ),
        }))
      },

      updateMessageStatus: (roomId, messageId, status) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: (state.messages[roomId] || []).map((m) =>
              m.id === messageId ? { ...m, status } : m
            ),
          },
        }))
      },

      addReaction: (roomId, messageId, emoji, isUser, agentId) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: (state.messages[roomId] || []).map((m) => {
              if (m.id !== messageId) return m
              const reactions = [...(m.reactions || [])]
              const existing = reactions.find((r) => r.emoji === emoji)
              if (existing) {
                if (isUser) existing.userReacted = true
                if (agentId && !existing.agentIds.includes(agentId)) existing.agentIds.push(agentId)
              } else {
                reactions.push({ emoji, userReacted: isUser, agentIds: agentId ? [agentId] : [] })
              }
              return { ...m, reactions }
            }),
          },
        }))
      },

      removeReaction: (roomId, messageId, emoji, isUser, agentId) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]: (state.messages[roomId] || []).map((m) => {
              if (m.id !== messageId) return m
              const reactions = (m.reactions || []).map((r) => {
                if (r.emoji !== emoji) return r
                return {
                  ...r,
                  userReacted: isUser ? false : r.userReacted,
                  agentIds: agentId ? r.agentIds.filter((id) => id !== agentId) : r.agentIds,
                }
              }).filter((r) => r.userReacted || r.agentIds.length > 0)
              return { ...m, reactions }
            }),
          },
        }))
      },

      addBookmark: (bookmark) => {
        set((state) => ({ bookmarks: [...state.bookmarks, bookmark] }))
      },

      removeBookmark: (bookmarkId) => {
        set((state) => ({ bookmarks: state.bookmarks.filter((b) => b.id !== bookmarkId) }))
      },

      createPoll: (poll) => {
        set((state) => ({ polls: [...state.polls, poll] }))
      },

      castVote: (pollId, optionId, voterId) => {
        set((state) => ({
          polls: state.polls.map((p) => {
            if (p.id !== pollId) return p
            return {
              ...p,
              options: p.options.map((o) => {
                const without = o.voterIds.filter((v) => v !== voterId)
                return o.id === optionId
                  ? { ...o, voterIds: [...without, voterId] }
                  : { ...o, voterIds: without }
              }),
            }
          }),
        }))
      },

      addSummary: (summary) => {
        set((state) => ({ summaries: [...state.summaries, summary] }))
      },
    }),
    { name: 'docmind-chat' }
  )
)
