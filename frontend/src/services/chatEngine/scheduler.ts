import type { Agent, DiscussionMode } from '@/types'
import type { ChatEvent } from './events'

interface SchedulerConfig {
  mode: DiscussionMode
  maxConcurrentResponses: number
  responseDelayMs: { min: number; max: number }
  idleThresholdMs: number
}

const MODE_CONFIGS: Record<DiscussionMode, SchedulerConfig> = {
  free: {
    mode: 'free',
    maxConcurrentResponses: 1,
    responseDelayMs: { min: 800, max: 2000 },
    idleThresholdMs: 15000,
  },
  moderated: {
    mode: 'moderated',
    maxConcurrentResponses: 1,
    responseDelayMs: { min: 1200, max: 3000 },
    idleThresholdMs: 30000,
  },
  debate: {
    mode: 'debate',
    maxConcurrentResponses: 1,
    responseDelayMs: { min: 600, max: 1500 },
    idleThresholdMs: 10000,
  },
}

export interface ScheduledTask {
  agent: Agent
  event: ChatEvent
  priority: number
  scheduledAt: number
}

export class Scheduler {
  private config: SchedulerConfig
  private queue: ScheduledTask[] = []
  private processing = false
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private onProcess: ((task: ScheduledTask) => Promise<void>) | null = null
  private onIdle: (() => void) | null = null

  constructor(mode: DiscussionMode = 'free') {
    this.config = MODE_CONFIGS[mode]
  }

  setMode(mode: DiscussionMode) {
    this.config = MODE_CONFIGS[mode]
  }

  setHandlers(handlers: {
    onProcess: (task: ScheduledTask) => Promise<void>
    onIdle: () => void
  }) {
    this.onProcess = handlers.onProcess
    this.onIdle = handlers.onIdle
  }

  enqueue(agent: Agent, event: ChatEvent, priority = 0) {
    this.queue.push({
      agent,
      event,
      priority,
      scheduledAt: Date.now(),
    })
    this.queue.sort((a, b) => b.priority - a.priority)
    this.resetIdleTimer()
    this.processNext()
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0 || !this.onProcess) return

    this.processing = true
    const task = this.queue.shift()!

    const delay = this.config.responseDelayMs.min +
      Math.random() * (this.config.responseDelayMs.max - this.config.responseDelayMs.min)
    await new Promise((resolve) => setTimeout(resolve, delay))

    try {
      await this.onProcess(task)
    } finally {
      this.processing = false
      this.resetIdleTimer()
      this.processNext()
    }
  }

  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      if (this.queue.length === 0 && !this.processing) {
        this.onIdle?.()
      }
    }, this.config.idleThresholdMs)
  }

  clear() {
    this.queue = []
    if (this.idleTimer) clearTimeout(this.idleTimer)
  }

  get pendingCount() {
    return this.queue.length
  }

  get isProcessing() {
    return this.processing
  }
}
