import type { Agent, Document, Review, AgentReview, Suggestion, ReviewSummary } from '@/types'
import { chatCompletion, LLMError } from './llmService'

const REVIEW_SYSTEM_PROMPT = (agent: Agent) => `${agent.system_prompt}

你现在正在执行文档评审任务。请按照以下 JSON 格式输出评审结果（仅输出 JSON，不要其他内容）：

{
  "score": 4.2,
  "opinion": "你对文档的整体评价，2-4段话",
  "dimensions": [
    {"name": "结构", "score": 4.5},
    {"name": "逻辑", "score": 4.0},
    {"name": "表达", "score": 3.8},
    {"name": "可行性", "score": 4.5}
  ],
  "suggestions": [
    {"content": "具体的修改建议，必须引用原文位置", "priority": "high"},
    {"content": "另一条建议", "priority": "medium"}
  ]
}

评分范围 1-5，保留一位小数。suggestions 的 priority 仅限 "high"、"medium"、"low"。建议数量 2-5 条。`

function parseReviewJSON(text: string): { score: number; opinion: string; dimensions: { name: string; score: number }[]; suggestions: { content: string; priority: string }[] } | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch {
    return null
  }
}

export interface ReviewProgress {
  agentId: string
  agentName: string
  status: 'pending' | 'reviewing' | 'done' | 'error'
  streamText: string
  result?: AgentReview
  error?: string
}

export async function executeAgentReview(
  agent: Agent,
  doc: Document,
  onProgress: (text: string) => void,
  signal?: AbortSignal,
): Promise<AgentReview> {
  const docContent = doc.raw_content || '(文档内容为空)'
  const truncated = docContent.slice(0, 12000)

  return new Promise<AgentReview>((resolve, reject) => {
    let fullText = ''
    chatCompletion(
      [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT(agent) },
        { role: 'user', content: `请评审以下文档：\n\n标题：${doc.title}\n\n内容：\n${truncated}` },
      ],
      {
        onChunk: (chunk) => {
          fullText += chunk
          onProgress(fullText)
        },
        onDone: (text) => {
          const parsed = parseReviewJSON(text)
          if (!parsed) {
            resolve({
              agent_id: agent.id,
              agent_name: agent.name,
              agent_color: agent.color,
              score: 3.5,
              opinion: text.slice(0, 500) || '评审结果解析失败，请重试',
              dimensions: [
                { name: '结构', score: 3.5 }, { name: '逻辑', score: 3.5 },
                { name: '表达', score: 3.5 }, { name: '可行性', score: 3.5 },
              ],
              suggestions: [],
            })
            return
          }
          resolve({
            agent_id: agent.id,
            agent_name: agent.name,
            agent_color: agent.color,
            score: Math.min(5, Math.max(1, parsed.score)),
            opinion: parsed.opinion,
            dimensions: parsed.dimensions.map((d) => ({
              name: d.name, score: Math.min(5, Math.max(1, d.score)),
            })),
            suggestions: parsed.suggestions.map((s) => ({
              id: crypto.randomUUID(),
              content: s.content,
              priority: (['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium') as Suggestion['priority'],
              adopted: false,
              source_agent: agent.name,
            })),
          })
        },
        onError: (err) => reject(err),
      },
      signal,
    ).catch(reject)
  })
}

function collectSuggestions(agentReviews: AgentReview[]) {
  const allSuggestions = agentReviews.flatMap((ar) => ar.suggestions)
  const highPriority = allSuggestions.filter((s) => s.priority === 'high')
  const mediumPriority = allSuggestions.filter((s) => s.priority === 'medium')
  const sorted = [...highPriority, ...mediumPriority, ...allSuggestions.filter((s) => s.priority === 'low')]
  return sorted.filter((s, i, arr) => arr.findIndex((x) => x.content === s.content) === i).slice(0, 8)
}

export async function generateSummary(agentReviews: AgentReview[]): Promise<ReviewSummary> {
  const top_suggestions = collectSuggestions(agentReviews)

  if (agentReviews.length < 2) {
    return {
      consensus: agentReviews.length === 1 ? [agentReviews[0].opinion.slice(0, 200)] : [],
      controversies: [],
      top_suggestions,
    }
  }

  const agentSummaries = agentReviews.map((ar) =>
    `【${ar.agent_name}】评分 ${ar.score.toFixed(1)}\n观点：${ar.opinion}\n建议：${ar.suggestions.map((s) => s.content).join('；')}`
  ).join('\n\n')

  const prompt = `以下是多位评审者对同一文档的评审结果：

${agentSummaries}

请分析所有评审者的观点，提取：
1. consensus：所有评审者都认同的观点（1-3条）
2. controversies：评审者之间存在分歧的话题（0-2条），每条包含 topic 和各方 stance

仅输出 JSON，格式：
{
  "consensus": ["共识1", "共识2"],
  "controversies": [
    {
      "topic": "分歧话题",
      "opinions": [
        {"agent_name": "张三", "agent_color": "indigo", "stance": "张三的观点"},
        {"agent_name": "李四", "agent_color": "violet", "stance": "李四的观点"}
      ]
    }
  ]
}`

  try {
    const result = await new Promise<{ consensus: string[]; controversies: ReviewSummary['controversies'] }>((resolve) => {
      let fullText = ''
      chatCompletion(
        [
          { role: 'system', content: '你是一个中立的汇总分析助手，擅长从多个观点中提取共识和分歧。仅输出 JSON。' },
          { role: 'user', content: prompt },
        ],
        {
          onChunk: (chunk) => { fullText += chunk },
          onDone: (text) => {
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                const agentColorMap: Record<string, string> = {}
                for (const ar of agentReviews) agentColorMap[ar.agent_name] = ar.agent_color
                const controversies = (parsed.controversies || []).map((c: { topic: string; opinions: { agent_name: string; agent_color?: string; stance: string }[] }) => ({
                  topic: c.topic,
                  opinions: (c.opinions || []).map((op: { agent_name: string; agent_color?: string; stance: string }) => ({
                    agent_name: op.agent_name,
                    agent_color: agentColorMap[op.agent_name] || op.agent_color || 'slate',
                    stance: op.stance,
                  })),
                }))
                resolve({
                  consensus: Array.isArray(parsed.consensus) ? parsed.consensus : [],
                  controversies,
                })
                return
              }
            } catch { /* fall through */ }
            resolve({ consensus: ['各评审者已完成评审'], controversies: [] })
          },
          onError: () => {
            resolve({ consensus: ['各评审者已完成评审'], controversies: [] })
          },
        },
      ).catch(() => {
        resolve({ consensus: ['各评审者已完成评审'], controversies: [] })
      })
    })

    return { ...result, top_suggestions }
  } catch {
    return {
      consensus: ['各评审者已完成评审，请查看各角色的具体观点'],
      controversies: [],
      top_suggestions,
    }
  }
}
