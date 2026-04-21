import type { Agent, Document, AgentReview, Suggestion, ReviewSummary } from '@/types'
import { TEACHING_DIMENSIONS } from '@/types'
import { chatCompletion } from './llmService'
import { createId } from '@/utils/id'

const REVIEW_SYSTEM_PROMPT = (agent: Agent) => `${agent.system_prompt}

你现在正在执行教研案评审任务。请按照以下 JSON 格式输出评审结果（仅输出 JSON，不要其他内容）：

{
  "score": 4.2,
  "opinion": "你对这份教研案的整体评价，从你的角色视角出发，2-4段话。注意不要评价课件的交互逻辑和功能设计，专注于教研案内容本身。",
  "dimensions": [
    {"name": "课程设计", "score": 4.5, "comment": "一句话点评"},
    {"name": "知识链", "score": 4.0, "comment": "一句话点评"},
    {"name": "教学目标", "score": 3.8, "comment": "一句话点评"},
    {"name": "课程重点", "score": 4.5, "comment": "一句话点评"},
    {"name": "课程难点", "score": 4.0, "comment": "一句话点评"},
    {"name": "学习梯度", "score": 3.5, "comment": "一句话点评"}
  ],
  "suggestions": [
    {"content": "具体的修改建议，必须引用原文位置", "priority": "high"},
    {"content": "另一条建议", "priority": "medium"}
  ]
}

评分范围 1-5，保留一位小数。dimensions 必须包含以上 6 个维度。suggestions 的 priority 仅限 "high"、"medium"、"low"。建议数量 2-5 条。
重要：不要评价课件的交互逻辑和功能设计，专注于教研内容是否合理、是否符合教学设计需求。`

function parseReviewJSON(text: string): { score: number; opinion: string; dimensions: { name: string; score: number; comment?: string }[]; suggestions: { content: string; priority: string }[] } | null {
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

  const teachingContext = doc.teaching_plan
    ? `\n\n【教研案结构化信息】\n学科：${doc.teaching_plan.subject || '未识别'}\n年级：${doc.teaching_plan.grade || '未识别'}\n课题：${doc.teaching_plan.topic || '未识别'}\n课时：${doc.teaching_plan.duration || '未识别'}${doc.teaching_plan.objectives ? `\n教学目标：\n  知识与技能：${doc.teaching_plan.objectives.knowledge || '未明确'}\n  过程与方法：${doc.teaching_plan.objectives.process || '未明确'}\n  情感态度与价值观：${doc.teaching_plan.objectives.emotion || '未明确'}` : ''}${doc.teaching_plan.keyPoints?.length ? `\n教学重点：${doc.teaching_plan.keyPoints.join('；')}` : ''}${doc.teaching_plan.difficulties?.length ? `\n教学难点：${doc.teaching_plan.difficulties.join('；')}` : ''}`
    : ''

  return new Promise<AgentReview>((resolve, reject) => {
    let fullText = ''
    chatCompletion(
      [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT(agent) },
        { role: 'user', content: `请评审以下教研案：\n\n标题：${doc.title}${teachingContext}\n\n完整内容：\n${truncated}` },
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
              dimensions: TEACHING_DIMENSIONS.map((d) => ({ name: d, score: 3.5 })),
              suggestions: [],
            })
            return
          }

          const dimensionMap = new Map(parsed.dimensions.map((d) => [d.name, d]))
          const normalizedDimensions = TEACHING_DIMENSIONS.map((dimName) => {
            const found = dimensionMap.get(dimName)
            return {
              name: dimName,
              score: found ? Math.min(5, Math.max(1, found.score)) : 3.5,
              comment: found?.comment,
            }
          })

          resolve({
            agent_id: agent.id,
            agent_name: agent.name,
            agent_color: agent.color,
            score: Math.min(5, Math.max(1, parsed.score)),
            opinion: parsed.opinion,
            dimensions: normalizedDimensions,
            suggestions: parsed.suggestions.map((s) => ({
              id: createId(),
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
    `【${ar.agent_name}】评分 ${ar.score.toFixed(1)}\n观点：${ar.opinion}\n各维度：${ar.dimensions.map((d) => `${d.name}=${d.score}`).join('、')}\n建议：${ar.suggestions.map((s) => s.content).join('；')}`
  ).join('\n\n')

  const prompt = `以下是多位评审者（包括教研老师、学生和家长视角）对同一份教研案的评审结果：

${agentSummaries}

请分析所有评审者的观点，提取：
1. consensus：所有评审者都认同的观点（1-3条），特别关注不同角色（教师/学生/家长）的共识
2. controversies：评审者之间存在分歧的话题（0-2条），特别关注教师与学生/家长视角的差异

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
          { role: 'system', content: '你是一个中立的教研评审汇总分析助手，擅长从教师、学生、家长多个视角中提取共识和分歧。仅输出 JSON。' },
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
