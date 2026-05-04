import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TEACHING_EVAL_DIMENSIONS } from '@/types'
import type { Agent, Document, DiffResult } from '@/types'
import { executeCompareReview, executeTeachingEvalReview, generateTifenReport } from '../reviewEngine'

type MockMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type MockCallbacks = {
  onChunk: (text: string) => void
  onDone: (text: string) => void
  onError: (error: Error) => void
}

const { chatCompletionMock } = vi.hoisted(() => ({
  chatCompletionMock: vi.fn(),
}))

vi.mock('../llmService', () => ({
  chatCompletion: chatCompletionMock,
}))

const agent: Agent = {
  id: 'agent-1',
  owner_id: 'user-1',
  name: '教研负责人',
  tagline: '关注提分效果',
  personality: { directness: 4, strictness: 4, humor: 1, empathy: 3 },
  expertise: ['教研'],
  behavior: { style: '直接' },
  system_prompt: '你是教研负责人。',
  source: 'custom',
  is_public: false,
  usage_count: 0,
  color: 'indigo',
  created_at: '2026-05-04T00:00:00.000Z',
}

const document: Document = {
  id: 'doc-1',
  owner_id: 'user-1',
  title: '圆的面积教案',
  file_name: 'lesson.txt',
  file_type: 'txt',
  file_size: 120,
  raw_content: '课题：圆的面积\n目标：掌握面积公式并能解决变式题。',
  status: 'ready',
  review_count: 0,
  created_at: '2026-05-04T00:00:00.000Z',
}

function mockCompletion(payload: unknown, onMessages?: (messages: MockMessage[]) => void) {
  chatCompletionMock.mockImplementation(async (messages: MockMessage[], callbacks: MockCallbacks) => {
    onMessages?.(messages)
    callbacks.onChunk('')
    callbacks.onDone(JSON.stringify(payload))
  })
}

describe('reviewEngine done-task integrations', () => {
  beforeEach(() => {
    chatCompletionMock.mockReset()
  })

  it('executes teaching eval reviews with the three required dimensions', async () => {
    let capturedMessages: MockMessage[] = []
    mockCompletion(
      {
        score: 4.7,
        opinion: '聚焦提分路径，知识点落地较清晰。',
        highlights: ['变式训练方向明确'],
        dimensions: [
          { name: '知识掌握', score: 4.5, comment: '知识点覆盖完整', evidence: '掌握面积公式' },
          { name: '原理理解', score: 4.1, comment: '原理解释需要更充分', evidence: '面积公式' },
          { name: '迁移应用', score: 3.8, comment: '迁移题数量偏少', evidence: '变式题' },
        ],
        suggestions: [
          {
            title: '补充变式题',
            content: '问题定位 -> 增加两类变式题 -> 提升考试迁移表现',
            priority: 'high',
            evidence: '变式题',
            expected_effect: '提升迁移应用得分',
          },
        ],
      },
      (messages) => {
        capturedMessages = messages
      },
    )

    const result = await executeTeachingEvalReview(agent, document, vi.fn())

    expect(result.status).toBe('completed')
    expect(result.dimensions.map((dimension) => dimension.name)).toEqual(TEACHING_EVAL_DIMENSIONS)
    expect(result.dimensions[0]).toMatchObject({ name: '知识掌握', score: 4.5, evidence: '掌握面积公式' })
    expect(result.suggestions[0]).toMatchObject({ source_agent: '教研负责人', priority: 'high' })
    expect(capturedMessages[0].content).toContain('三维评价体系')
    expect(capturedMessages[0].content).toContain('在线教育机构')
  })

  it('executes compare reviews with modify points and modification stats in context', async () => {
    let capturedMessages: MockMessage[] = []
    const diffResult: DiffResult = {
      oldFileName: 'before.txt',
      newFileName: 'after.txt',
      points: [
        { type: 'modify', text: '目标 B\n', oldText: '目标 A\n', newText: '目标 B\n' },
        { type: 'add', text: '新增练习\n' },
        { type: 'delete', text: '删除活动\n' },
        { type: 'equal', text: '保留内容\n' },
      ],
      stats: { additions: 1, modifications: 1, deletions: 1, equalLines: 1 },
    }
    mockCompletion(
      {
        pointReviews: [
          { pointIndex: 0, isCore: true, isNecessary: true, alignsWithKnowledge: true, comment: '修改目标更聚焦。' },
          { pointIndex: 1, isCore: false, isNecessary: true, alignsWithKnowledge: true, comment: '新增练习合理。' },
          { pointIndex: 2, isCore: false, isNecessary: false, alignsWithKnowledge: false, comment: '删除活动需要解释。' },
        ],
        overview: '整体修改方向清晰。',
        overallAssessment: '建议保留核心改动。',
      },
      (messages) => {
        capturedMessages = messages
      },
    )

    const report = await executeCompareReview(agent, diffResult, vi.fn())

    expect(report.pointReviews).toHaveLength(3)
    expect(report.pointReviews[0]).toMatchObject({
      diffType: 'modify',
      oldText: '目标 A\n',
      newText: '目标 B\n',
      isCore: true,
    })
    expect(report.pointReviews[1]).toMatchObject({ diffType: 'add', newText: '新增练习\n' })
    expect(report.pointReviews[2]).toMatchObject({ diffType: 'delete', oldText: '删除活动\n' })
    expect(capturedMessages[1].content).toContain('修改 1 处')
    expect(capturedMessages[1].content).toContain('修改前')
    expect(capturedMessages[1].content).toContain('修改后')
  })

  it('generates tifen report with dedicated prompt directions', async () => {
    let capturedMessages: MockMessage[] = []
    chatCompletionMock.mockImplementation(async (messages: MockMessage[], callbacks: MockCallbacks) => {
      capturedMessages = messages
      callbacks.onChunk('## 提分与升学\n')
      callbacks.onDone('## 提分与升学\n补充密考变式训练。')
    })

    const report = await generateTifenReport(document, [
      {
        agent_id: agent.id,
        agent_name: agent.name,
        agent_color: agent.color,
        score: 4.2,
        opinion: '提分路径清晰。',
        status: 'completed',
        dimensions: [
          { name: '知识掌握', score: 4.2, comment: '知识掌握较好。' },
          { name: '原理理解', score: 3.8, comment: '原理解释略弱。' },
          { name: '迁移应用', score: 3.7, comment: '迁移题还要增加。' },
        ],
        suggestions: [
          {
            id: 's1',
            title: '补密考题',
            content: '增加一题密考变式。',
            priority: 'high',
            adopted: false,
            source_agent: agent.name,
          },
        ],
      },
    ])

    expect(report).toContain('密考变式')
    expect(capturedMessages[0].content).toContain('请使用简体中文回复')
    expect(capturedMessages[0].content).toContain('提分与升学')
    expect(capturedMessages[1].content).toContain('密考应对')
  })
})
