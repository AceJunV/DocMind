import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatRoom, ChatMessage, Agent } from '@/types'
import { useActivityStore } from './activityStore'

interface ChatState {
  rooms: ChatRoom[]
  messages: Record<string, ChatMessage[]>

  createRoom: (room: ChatRoom) => void
  closeRoom: (id: string) => void
  removeRoom: (id: string) => void
  getRoom: (id: string) => ChatRoom | undefined

  addMessage: (roomId: string, message: ChatMessage) => void
  getMessages: (roomId: string) => ChatMessage[]

  addParticipant: (roomId: string, agent: Agent) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      rooms: [],
      messages: {},

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
    }),
    { name: 'docmind-chat' }
  )
)
