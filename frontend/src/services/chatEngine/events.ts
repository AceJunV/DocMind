import type { Agent, DiscussionMode, RoleEventType } from '@/types'

export type ChatEventType =
  | 'user_message'
  | 'agent_response'
  | 'idle'
  | 'role_collision'
  | 'topic_trigger'
  | 'role_event'
  | 'poll_created'
  | 'summary_requested'

export interface ChatEvent {
  type: ChatEventType
  roomId: string
  timestamp: number
  payload: Record<string, unknown>
}

export interface UserMessageEvent extends ChatEvent {
  type: 'user_message'
  payload: {
    content: string
    targetAgentId?: string
    replyToMessageId?: string
  }
}

export interface AgentResponseEvent extends ChatEvent {
  type: 'agent_response'
  payload: {
    agentId: string
    content: string
    replyToMessageId?: string
  }
}

export interface IdleEvent extends ChatEvent {
  type: 'idle'
  payload: {
    idleDurationMs: number
    mode: DiscussionMode
  }
}

export interface RoleCollisionEvent extends ChatEvent {
  type: 'role_collision'
  payload: {
    agentA: Agent
    agentB: Agent
    topic: string
    stanceA: string
    stanceB: string
  }
}

export interface TopicTriggerEvent extends ChatEvent {
  type: 'topic_trigger'
  payload: {
    topic: string
    suggestedAgentId?: string
  }
}

export interface RoleEventPayload extends ChatEvent {
  type: 'role_event'
  payload: {
    eventType: RoleEventType
    triggeredBy: string
    targetAgentId?: string
    content: string
  }
}

export function createEvent<T extends ChatEvent>(
  type: T['type'],
  roomId: string,
  payload: T['payload'],
): T {
  return { type, roomId, timestamp: Date.now(), payload } as T
}
