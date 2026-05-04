import { test, expect } from '@playwright/test'

const authState = {
  state: {
    user: {
      id: 'user-done-smoke',
      email: 'user@docmind.local',
      name: '体验用户',
      created_at: '2026-05-04T00:00:00.000Z',
    },
    token: 'auto-token',
    isAuthenticated: true,
  },
  version: 0,
}

const settingsState = {
  state: {
    profiles: [],
    activeProfileId: null,
    currentConfig: {
      providerMode: 'third-party',
      model: 'deepseek-chat',
      apiKey: 'playwright-test-key',
      baseUrl: 'http://mock-llm.local/v1',
      localEndpoint: '',
      maxConcurrentReviews: 2,
    },
  },
  version: 0,
}

const documents = [
  {
    id: 'doc-old-smoke',
    owner_id: 'user-done-smoke',
    title: '旧版教案',
    file_name: 'old.txt',
    file_type: 'txt',
    file_size: 120,
    raw_content: '目标：学生了解圆的面积公式。\n活动：线下分组剪纸。\n小结：回顾公式。\n',
    structured_content: { sections: [{ title: '全文', content: '旧版内容' }] },
    summary: '旧版教案',
    word_count: 36,
    status: 'ready',
    review_count: 0,
    created_at: '2026-05-04T00:00:00.000Z',
  },
  {
    id: 'doc-new-smoke',
    owner_id: 'user-done-smoke',
    title: '新版教案',
    file_name: 'new.txt',
    file_type: 'txt',
    file_size: 160,
    raw_content: '目标：学生掌握圆的面积公式并完成变式题。\n小结：回顾公式。\n练习：增加两道考试迁移题。\n',
    structured_content: { sections: [{ title: '全文', content: '新版内容' }] },
    summary: '新版教案',
    word_count: 42,
    status: 'ready',
    review_count: 0,
    created_at: '2026-05-04T00:00:00.000Z',
  },
]

const agents = [
  {
    id: 'agent-done-smoke',
    owner_id: 'user-done-smoke',
    name: '提分教研员',
    tagline: '关注知识掌握与迁移应用',
    personality: { directness: 4, strictness: 4, humor: 1, empathy: 3 },
    expertise: ['提分策略', '教研评审'],
    behavior: { style: '直接务实' },
    system_prompt: '你是一位在线教育教研员，关注提分效果。',
    source: 'custom',
    is_public: false,
    usage_count: 0,
    color: 'indigo',
    category: 'teacher',
    created_at: '2026-05-04T00:00:00.000Z',
  },
]

const reviewsState = {
  state: {
    reviews: [
      {
        id: 'review-normal-smoke',
        document_id: 'doc-new-smoke',
        owner_id: 'user-done-smoke',
        overall_score: 4.2,
        status: 'completed',
        created_at: '2026-05-04T00:00:00.000Z',
        document: documents[1],
        agents,
        agent_reviews: [
          {
            agent_id: 'agent-done-smoke',
            agent_name: '提分教研员',
            agent_color: 'indigo',
            score: 4.2,
            opinion: '新版教案更聚焦提分，但迁移应用还可以继续压实。',
            status: 'completed',
            highlights: ['补充了考试迁移题'],
            dimensions: [
              { name: '知识掌握', score: 4.4, comment: '公式掌握目标清晰。', evidence: '学生掌握圆的面积公式并完成变式题' },
              { name: '原理理解', score: 4.0, comment: '原理解释仍需展开。', evidence: '目标：学生掌握圆的面积公式并完成变式题。' },
              { name: '迁移应用', score: 4.1, comment: '新增迁移题方向正确。', evidence: '练习：增加两道考试迁移题。' },
            ],
            suggestions: [
              {
                id: 'suggestion-normal-smoke',
                title: '继续补迁移题',
                content: '增加一题反向推导和一题综合应用，强化考试迁移。',
                priority: 'high',
                adopted: false,
                source_agent: '提分教研员',
                evidence: '练习：增加两道考试迁移题。',
                expected_effect: '提升迁移应用得分。',
              },
            ],
          },
        ],
        summary: {
          overview: '新版教案聚焦提分，仍需补足原理解释与迁移训练。',
          strengths: ['补充了考试迁移题', '目标从了解升级为掌握'],
          pain_points: ['原理解释仍偏短', '迁移题数量仍少', '评价闭环还不够明确'],
          consensus: ['提分方向更明确'],
          controversies: [],
          top_suggestions: [
            {
              id: 'summary-suggestion-normal-smoke',
              title: '继续补迁移题',
              content: '增加一题反向推导和一题综合应用，强化考试迁移。',
              priority: 'high',
              adopted: false,
              source_agent: '提分教研员',
              evidence: '练习：增加两道考试迁移题。',
              expected_effect: '提升迁移应用得分。',
            },
          ],
        },
        tifenReport: '## 提分与升学\n把圆面积公式掌握转化为限时得分点，先做基础识别，再做反向推导。\n## 竞赛支持\n补充一题综合应用，连接竞赛常见的面积分割思路。\n## 密考应对\n增加错因复盘和同类变式检测，确认迁移应用是否稳定。',
      },
      {
        id: 'review-compare-smoke',
        document_id: 'doc-new-smoke',
        owner_id: 'user-done-smoke',
        status: 'completed',
        created_at: '2026-05-04T00:00:00.000Z',
        document: documents[1],
        agents,
        compareReport: {
          overview: '整体修改方向聚焦提分。',
          overallAssessment: '新版删除线下活动并补充迁移题，方向合理。',
          pointReviews: [
            {
              pointIndex: 0,
              diffType: 'modify',
              oldText: '目标：学生了解圆的面积公式。',
              newText: '目标：学生掌握圆的面积公式并完成变式题。',
              isCore: true,
              isNecessary: true,
              alignsWithKnowledge: true,
              comment: '目标从了解升级到掌握和变式应用，更贴合提分导向。',
            },
            {
              pointIndex: 1,
              diffType: 'delete',
              oldText: '活动：线下分组剪纸。',
              newText: '',
              isCore: false,
              isNecessary: true,
              alignsWithKnowledge: true,
              comment: '删除线下活动符合在线课堂约束。',
            },
            {
              pointIndex: 2,
              diffType: 'add',
              oldText: '',
              newText: '练习：增加两道考试迁移题。',
              isCore: true,
              isNecessary: true,
              alignsWithKnowledge: true,
              comment: '新增迁移题能补足考试应用环节。',
            },
          ],
        },
      },
    ],
  },
  version: 0,
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ auth, settings, docs, agentsStore, reviews }) => {
      window.localStorage.clear()
      window.localStorage.setItem('docmind-auth', JSON.stringify(auth))
      window.localStorage.setItem('docmind-settings', JSON.stringify(settings))
      window.localStorage.setItem('docmind-theme', JSON.stringify({ state: { theme: 'light' }, version: 0 }))
      window.localStorage.setItem('docmind-documents', JSON.stringify({ state: { documents: docs }, version: 0 }))
      window.localStorage.setItem('docmind-agents', JSON.stringify({ state: { agents: agentsStore, hiddenTemplateIds: [], trashedAgents: [] }, version: 0 }))
      window.localStorage.setItem('docmind-reviews', JSON.stringify(reviews))
      window.localStorage.setItem('docmind-chat', JSON.stringify({ state: { rooms: [], messages: {}, bookmarks: [], polls: [], summaries: [] }, version: 0 }))
      window.localStorage.setItem('docmind-activities', JSON.stringify({ state: { activities: [] }, version: 0 }))
    },
    { auth: authState, settings: settingsState, docs: documents, agentsStore: agents, reviews: reviewsState },
  )
})

test('Done tasks smoke: compare create flow, compare report, and agent persona tools', async ({ page }) => {
  await page.goto('/reviews/create')
  await page.getByRole('button', { name: /新版教案/ }).click()
  await expect(page.getByText('案例详情')).toBeVisible()
  await expect(page.getByText('学生掌握圆的面积公式并完成变式题')).toBeVisible()
  await expect(page.getByRole('button', { name: '开始评审' }).first()).toBeVisible()

  await page.goto('/reviews/create')
  await page.getByRole('button', { name: /对比评审/ }).click()
  await expect(page.getByRole('heading', { name: '选择对比文件' })).toBeVisible()

  await page.getByRole('button', { name: /旧版教案/ }).first().click()
  await page.getByRole('button', { name: /新版教案/ }).last().click()
  await expect(page.getByText('修改前内容预览')).toBeVisible()
  await expect(page.getByText('修改后内容预览')).toBeVisible()
  await expect(page.getByText('学生了解圆的面积公式')).toBeVisible()
  await expect(page.getByText('学生掌握圆的面积公式')).toBeVisible()

  await page.getByRole('button', { name: /对比差异/ }).click()
  await expect(page.getByText(/1 修改/)).toBeVisible()
  await expect(page.getByRole('button', { name: '全选' })).toBeVisible()
  await page.getByRole('button', { name: '全选' }).click()
  await expect(page.getByRole('button', { name: '清空' })).toBeVisible()

  await page.goto('/reviews/compare/review-compare-smoke')
  await expect(page.getByRole('heading', { name: '对比评审报告' })).toBeVisible()
  await expect(page.getByText('修改', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: '修改' }).click()
  await expect(page.getByText('目标从了解升级到掌握和变式应用')).toBeVisible()
  await expect(page.getByText('修改前')).toBeVisible()
  await expect(page.getByText('修改后')).toBeVisible()

  await page.goto('/reviews/review-normal-smoke')
  await expect(page.getByRole('heading', { name: /新版教案/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: '核心提炼' })).toBeVisible()
  await expect(page.getByText('3 个核心问题')).toBeVisible()
  await expect(page.getByRole('heading', { name: '三维评价' })).toBeVisible()
  await expect(page.getByText('一级主评分')).toBeVisible()
  await expect(page.getByRole('heading', { name: '六维辅助评价' })).toBeVisible()
  await page.getByRole('button', { name: '展开六维' }).click()
  await expect(page.getByText('当前报告没有生成六维辅助评分数据')).toBeVisible()
  await expect(page.getByRole('heading', { name: '提分思路' })).toBeVisible()
  await expect(page.getByText('AI建议报告')).toBeVisible()
  await expect(page.getByText('密考应对')).toBeVisible()
  await page.getByRole('button', { name: /练习：增加两道考试迁移题/ }).first().click()
  await expect(page.getByRole('heading', { name: '原文证据定位' })).toBeVisible()
  await expect(page.getByText('证据高亮')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出图片' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('.png')

  await page.goto('/agents/agent-done-smoke/edit')
  await expect(page.getByText('人物设定')).toBeVisible()
  await expect(page.getByText('AI优化')).toBeVisible()
  await expect(page.getByText('AI续写')).toBeVisible()

  await page.goto('/chat?review=review-compare-smoke')
  await expect(page.getByRole('heading', { name: '配置教研研讨' })).toBeVisible()
  await expect(page.getByText('讨论模式')).toBeVisible()
  await expect(page.getByText('主动性')).toBeVisible()
  await expect(page.getByRole('button', { name: '创建 (1 位角色)' })).toBeVisible()
  await page.getByRole('button', { name: '创建 (1 位角色)' }).click()
  await expect(page).toHaveURL(/\/chat\/.+/)

})

test('Done tasks smoke: review create guides users when no agents exist', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('docmind-agents', JSON.stringify({ state: { agents: [], hiddenTemplateIds: [], trashedAgents: [] }, version: 0 }))
  })

  await page.goto('/agents')
  await expect(page.getByText('创建你的第一个角色')).toBeVisible()
  await expect(page.getByRole('button', { name: '创建角色' })).toBeVisible()

  await page.goto('/reviews/create')
  await expect(page.getByText('先创建你的第一个评审角色')).toBeVisible()
  await expect(page.getByRole('link', { name: '创建角色' })).toBeVisible()
})

test('Done tasks smoke: global empty states show creation actions', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('docmind-documents', JSON.stringify({ state: { documents: [] }, version: 0 }))
    window.localStorage.setItem('docmind-agents', JSON.stringify({ state: { agents: [], hiddenTemplateIds: [], trashedAgents: [] }, version: 0 }))
    window.localStorage.setItem('docmind-reviews', JSON.stringify({ state: { reviews: [] }, version: 0 }))
  })

  await page.goto('/agents')
  await expect(page.getByText('创建你的第一个角色')).toBeVisible()

  await page.goto('/documents')
  await expect(page.getByText('还没有文档')).toBeVisible()
  await expect(page.getByRole('button', { name: '上传文档' }).first()).toBeVisible()

  await page.goto('/reviews')
  await expect(page.getByText('还没有评审记录')).toBeVisible()
  await expect(page.getByRole('link', { name: /发起评审/ }).first()).toBeVisible()
})

test('Done tasks smoke: chat follow-up, agent filter, and quoted suggestions', async ({ page }) => {
  const secondAgent = {
    ...agents[0],
    id: 'agent-counter-smoke',
    name: '结构教研员',
    color: 'emerald',
    tagline: '关注课堂结构与节奏',
    system_prompt: '你是一位关注课堂结构的教研员。',
  }
  const roomId = 'room-task7-smoke'
  const chatState = {
    state: {
      rooms: [
        {
          id: roomId,
          document_id: 'doc-new-smoke',
          review_id: 'review-normal-smoke',
          owner_id: 'user-done-smoke',
          topic: '迁移题讨论',
          status: 'active',
          participants: [agents[0], secondAgent],
          discussionMode: 'moderated',
          discussionState: 'idle',
          pendingTopics: [],
          created_at: '2026-05-04T00:00:00.000Z',
          stats: { messageCount: 3, lastActiveAt: '2026-05-04T00:03:00.000Z' },
        },
      ],
      messages: {
        [roomId]: [
          {
            id: 'msg-user-smoke',
            room_id: roomId,
            sender_type: 'user',
            sender_id: 'user-done-smoke',
            sender_name: '体验用户',
            content: '请讨论新版教案的提分策略。',
            status: 'delivered',
            created_at: '2026-05-04T00:01:00.000Z',
          },
          {
            id: 'msg-agent-main-smoke',
            room_id: roomId,
            sender_type: 'agent',
            sender_id: 'agent-done-smoke',
            sender_name: '提分教研员',
            sender_color: 'indigo',
            content: '迁移题需要形成三步题组：基础识别、反向推导、综合应用。',
            intent: 'evidence',
            created_at: '2026-05-04T00:02:00.000Z',
          },
          {
            id: 'msg-agent-counter-smoke',
            room_id: roomId,
            sender_type: 'agent',
            sender_id: 'agent-counter-smoke',
            sender_name: '结构教研员',
            sender_color: 'emerald',
            content: '结构上还需要把讲解、练习和反馈闭环拆清楚。',
            intent: 'support',
            created_at: '2026-05-04T00:03:00.000Z',
          },
        ],
      },
      bookmarks: [],
      polls: [],
      summaries: [],
    },
    version: 0,
  }

  await page.addInitScript((state) => {
    window.localStorage.setItem('docmind-chat', JSON.stringify(state))
  }, chatState)

  await page.goto(`/chat/${roomId}`)
  await expect(page.getByText('迁移题需要形成三步题组')).toBeVisible()
  await expect(page.getByText('结构上还需要把讲解')).toBeVisible()

  await page.getByRole('button', { name: /筛选 提分教研员/ }).click()
  await expect(page.getByText('迁移题需要形成三步题组')).toBeVisible()
  await expect(page.getByText('结构上还需要把讲解')).not.toBeVisible()
  await page.getByRole('button', { name: '全部' }).click()
  await expect(page.getByText('结构上还需要把讲解')).toBeVisible()

  await page.getByText('迁移题需要形成三步题组').hover()
  await page.getByRole('button', { name: '追问 提分教研员' }).click()
  await expect(page.getByPlaceholder('输入消息... 可用 @ 提及角色，或 / 快捷命令')).toHaveValue(/@提分教研员 针对提分教研员的观点/)

  await page.getByText('引用建议').click()
  await page.getByRole('button', { name: /继续补迁移题/ }).click()
  await expect(page.getByPlaceholder('输入消息... 可用 @ 提及角色，或 / 快捷命令')).toHaveValue(/引用评审建议：“继续补迁移题：增加一题反向推导/)
})

test('Done tasks smoke: document detail aggregates reviews, chats, and suggestions', async ({ page }) => {
  const roomId = 'room-document-smoke'
  await page.addInitScript((state) => {
    window.localStorage.setItem('docmind-chat', JSON.stringify(state))
  }, {
    state: {
      rooms: [
        {
          id: roomId,
          document_id: 'doc-new-smoke',
          review_id: 'review-normal-smoke',
          owner_id: 'user-done-smoke',
          topic: '迁移题讨论',
          status: 'active',
          participants: agents,
          discussionMode: 'moderated',
          discussionState: 'idle',
          pendingTopics: [],
          created_at: '2026-05-04T00:00:00.000Z',
          stats: { messageCount: 1, lastActiveAt: '2026-05-04T00:01:00.000Z' },
        },
      ],
      messages: { [roomId]: [] },
      bookmarks: [],
      polls: [],
      summaries: [],
    },
    version: 0,
  })

  await page.goto('/documents')
  await page.locator('a[href="/documents/doc-new-smoke"]').first().click()
  await expect(page).toHaveURL(/\/documents\/doc-new-smoke/)
  await expect(page.getByRole('heading', { name: '新版教案' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '评审历史' })).toBeVisible()
  await expect(page.getByText('4.2 分')).toBeVisible()
  await expect(page.getByRole('heading', { name: '关联聊天室' })).toBeVisible()
  await expect(page.getByText('迁移题讨论')).toBeVisible()
  await expect(page.getByRole('heading', { name: '建议采纳统计' })).toBeVisible()
  await expect(page.getByText('建议总数')).toBeVisible()
  await expect(page.getByText('待采纳')).toBeVisible()

  await page.goto('/reviews')
  await expect(page.getByText('共 2 份评审记录，按时间倒序排列。')).toBeVisible()
  await expect(page.getByText('2 份评审', { exact: true })).toBeVisible()
})
