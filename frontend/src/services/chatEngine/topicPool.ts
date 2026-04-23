import type { Document, Review } from '@/types'

export interface Topic {
  id: string
  text: string
  source: 'document' | 'review' | 'user'
  priority: number
  used: boolean
}

export class TopicPool {
  private topics: Topic[] = []
  private nextId = 1

  loadFromDocument(doc: Document) {
    const sections: string[] = []

    if (doc.teaching_plan?.keyPoints) {
      sections.push(...doc.teaching_plan.keyPoints.map((kp) => `关于重点"${kp}"的教学处理`))
    }
    if (doc.teaching_plan?.difficulties) {
      sections.push(...doc.teaching_plan.difficulties.map((d) => `关于难点"${d}"的突破策略`))
    }
    if (doc.teaching_plan?.objectives) {
      const obj = doc.teaching_plan.objectives
      if (obj.knowledge) sections.push(`知识目标"${obj.knowledge}"的可达性`)
      if (obj.process) sections.push(`过程目标"${obj.process}"的落实方式`)
    }
    if (doc.teaching_plan?.topic) {
      sections.push(`"${doc.teaching_plan.topic}"的整体教学设计`)
    }

    for (const text of sections) {
      this.addTopic(text, 'document')
    }
  }

  loadFromReview(review: Review) {
    const agentReviews = review.agent_reviews?.filter((r) => r.status !== 'failed') || []

    for (const ar of agentReviews) {
      for (const suggestion of ar.suggestions.filter((s) => s.priority === 'high')) {
        this.addTopic(`${ar.agent_name}提出：${suggestion.content}`, 'review', 2)
      }
    }

    const summary = review.summary
    if (summary?.controversies) {
      for (const c of summary.controversies) {
        this.addTopic(`争议焦点：${c.topic}`, 'review', 3)
      }
    }
  }

  addTopic(text: string, source: Topic['source'], priority = 1) {
    this.topics.push({
      id: `topic-${this.nextId++}`,
      text,
      source,
      priority,
      used: false,
    })
    this.topics.sort((a, b) => b.priority - a.priority)
  }

  getNext(): Topic | null {
    const topic = this.topics.find((t) => !t.used)
    if (topic) topic.used = true
    return topic || null
  }

  getAll(): Topic[] {
    return [...this.topics]
  }

  getUnused(): Topic[] {
    return this.topics.filter((t) => !t.used)
  }

  reset() {
    for (const t of this.topics) t.used = false
  }
}
