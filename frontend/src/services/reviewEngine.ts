import type { Agent, AgentColor, Document, AgentReview, Suggestion, ReviewSummary } from '@/types'
import { TEACHING_DIMENSIONS } from '@/types'
import { chatCompletion } from './llmService'
import { createId } from '@/utils/id'

const REVIEW_SYSTEM_PROMPT = (agent: Agent) => `${agent.system_prompt}

你现在正在执行教研案评审任务。请按照以下 JSON 格式输出评审结果，仅输出 JSON：
{
  "score": 4.2,
  "opinion": "从你的角色视角出发，对这份教研案的整体评价，2-4段话。",
  "dimensions": [
    { "name": "课程设计", "score": 4.5, "comment": "一句话点评" },
    { "name": "知识链", "score": 4.0, "comment": "一句话点评" },
    { "name": "教学目标", "score": 3.8, "comment": "一句话点评" },
    { "name": "课程重点", "score": 4.5, "comment": "一句话点评" },
    { "name": "课程难点", "score": 4.0, "comment": "一句话点评" },
    { "name": "学习梯度", "score": 3.5, "comment": "一句话点评" }
  ],
  "suggestions": [
    { "content": "具体修改建议，最好引用原文位置", "priority": "high" },
    { "content": "另一条建议", "priority": "medium" }
  ]
}

评分范围 1-5，保留一位小数。dimensions 必须包含以上 6 个维度。suggestions 的 priority 仅限 "high"、"medium"、"low"。
重要：不要评价课件交互逻辑和功能设计，只专注教研内容本身。`

function parseReviewJSON(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0]) as {
      score: number
      opinion: string
      dimensions: { name: string; score: number; comment?: string }[]
      suggestions: { content: string; priority: string }[]
    }
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

export function createFailedAgentReview(agent: Agent, errorMessage: string): AgentReview {
  return {
    agent_id: agent.id,
    agent_name: agent.name,
    agent_color: agent.color,
    score: 0,
    opinion: '该角色本次分析未能成功生成，请根据错误信息重试。',
    status: 'failed',
    error_message: errorMessage,
    dimensions: TEACHING_DIMENSIONS.map((name) => ({ name, score: 0 })),
    suggestions: [],
  }
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
    ? `\n\n【教研案结构化信息】
学科：${doc.teaching_plan.subject || '未识别'}
年级：${doc.teaching_plan.grade || '未识别'}
课题：${doc.teaching_plan.topic || '未识别'}
课时：${doc.teaching_plan.duration || '未识别'}${doc.teaching_plan.objectives ? `\n教学目标：
  知识与技能：${doc.teaching_plan.objectives.knowledge || '未明确'}
  过程与方法：${doc.teaching_plan.objectives.process || '未明确'}
  情感态度与价值观：${doc.teaching_plan.objectives.emotion || '未明确'}` : ''}${doc.teaching_plan.keyPoints?.length ? `\n教学重点：${doc.teaching_plan.keyPoints.join('；')}` : ''}${doc.teaching_plan.difficulties?.length ? `\n教学难点：${doc.teaching_plan.difficulties.join('；')}` : ''}`
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
              status: 'completed',
              dimensions: TEACHING_DIMENSIONS.map((name) => ({ name, score: 3.5 })),
              suggestions: [],
            })
            return
          }

          const parsedDimensions = Array.isArray(parsed.dimensions) ? parsed.dimensions : []
          const parsedSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
          const dimensionMap = new Map(parsedDimensions.map((dimension) => [dimension.name, dimension]))
          const normalizedDimensions = TEACHING_DIMENSIONS.map((dimensionName) => {
            const found = dimensionMap.get(dimensionName)
            return {
              name: dimensionName,
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
            status: 'completed',
            dimensions: normalizedDimensions,
            suggestions: parsedSuggestions.map((suggestion) => ({
              id: createId(),
              content: suggestion.content,
              priority: (['high', 'medium', 'low'].includes(suggestion.priority) ? suggestion.priority : 'medium') as Suggestion['priority'],
              adopted: false,
              source_agent: agent.name,
            })),
          })
        },
        onError: (error) => reject(error),
      },
      signal,
    ).catch(reject)
  })
}

function collectSuggestions(agentReviews: AgentReview[]) {
  const allSuggestions = agentReviews.flatMap((agentReview) => agentReview.suggestions)
  const highPriority = allSuggestions.filter((suggestion) => suggestion.priority === 'high')
  const mediumPriority = allSuggestions.filter((suggestion) => suggestion.priority === 'medium')
  const lowPriority = allSuggestions.filter((suggestion) => suggestion.priority === 'low')

  return [...highPriority, ...mediumPriority, ...lowPriority]
    .filter((suggestion, index, suggestions) => suggestions.findIndex((item) => item.content === suggestion.content) === index)
    .slice(0, 8)
}

export async function generateSummary(agentReviews: AgentReview[]): Promise<ReviewSummary> {
  const completedReviews = agentReviews.filter((review) => review.status !== 'failed')
  const top_suggestions = collectSuggestions(completedReviews)

  if (completedReviews.length < 2) {
    return {
      consensus: completedReviews.length === 1 ? [completedReviews[0].opinion.slice(0, 200)] : [],
      controversies: [],
      top_suggestions,
    }
  }

  const agentSummaries = completedReviews.map((agentReview) =>
    `【${agentReview.agent_name}】评分 ${agentReview.score.toFixed(1)}
观点：${agentReview.opinion}
各维度：${agentReview.dimensions.map((dimension) => `${dimension.name}=${dimension.score}`).join('；')}
建议：${agentReview.suggestions.map((suggestion) => suggestion.content).join('；')}`
  ).join('\n\n')

  const prompt = `以下是多位评审者（包括教研老师、学生和家长视角）对同一份教研案的评审结果：

${agentSummaries}

请分析所有评审者的观点，提取：
1. consensus：所有评审者都认同的观点（1-3条），特别关注教师/学生/家长视角之间的共识
2. controversies：评审者之间存在分歧的话题（0-2条），特别关注教师与学生/家长视角的差异

仅输出 JSON，格式如下：
{
  "consensus": ["共识1", "共识2"],
  "controversies": [
    {
      "topic": "分歧话题",
      "opinions": [
        { "agent_name": "张三", "agent_color": "indigo", "stance": "张三的观点" },
        { "agent_name": "李四", "agent_color": "violet", "stance": "李四的观点" }
      ]
    }
  ]
}`

  try {
    const result = await new Promise<{ consensus: string[]; controversies: ReviewSummary['controversies'] }>((resolve) => {
      let fullText = ''

      chatCompletion(
        [
          { role: 'system', content: '你是一个中立的教研评审汇总分析助手，擅长从多个视角中提取共识和分歧。仅输出 JSON。' },
          { role: 'user', content: prompt },
        ],
        {
          onChunk: (chunk) => {
            fullText += chunk
          },
          onDone: (text) => {
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/)
              if (!jsonMatch) {
                resolve({ consensus: ['各评审者已完成评审'], controversies: [] })
                return
              }

              const parsed = JSON.parse(jsonMatch[0]) as {
                consensus?: string[]
                controversies?: { topic: string; opinions: { agent_name: string; agent_color?: string; stance: string }[] }[]
              }

              const agentColorMap: Record<string, string> = {}
              for (const review of completedReviews) {
                agentColorMap[review.agent_name] = review.agent_color
              }

              resolve({
                consensus: Array.isArray(parsed.consensus) ? parsed.consensus : [],
                controversies: (parsed.controversies || []).map((controversy) => ({
                  topic: controversy.topic,
                  opinions: (controversy.opinions || []).map((opinion) => ({
                    agent_name: opinion.agent_name,
                    agent_color: (agentColorMap[opinion.agent_name] || opinion.agent_color || 'slate') as AgentColor,
                    stance: opinion.stance,
                  })),
                })),
              })
            } catch {
              resolve({ consensus: ['各评审者已完成评审'], controversies: [] })
            }
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
