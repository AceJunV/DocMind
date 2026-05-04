import type { AgentReview, Document } from '@/types'

type PromptMessage = { role: 'system' | 'user'; content: string }

function buildDimensionDigest(agentReviews: AgentReview[]) {
  return agentReviews
    .map((review) => {
      const dimensions = review.dimensions
        .map((dimension) => `${dimension.name} ${dimension.score.toFixed(1)}/5：${dimension.comment || '暂无评语'}`)
        .join('\n')
      const suggestions = review.suggestions
        .slice(0, 3)
        .map((suggestion) => `- ${suggestion.title || '建议'}：${suggestion.content}`)
        .join('\n')

      return `【${review.agent_name}】\n总体：${review.opinion}\n${dimensions}\n建议：\n${suggestions || '- 暂无'}`
    })
    .join('\n\n')
}

export function buildTifenReportMessages(document: Document, agentReviews: AgentReview[]): PromptMessage[] {
  const documentContent = (document.raw_content || document.summary || '').slice(0, 9000)
  const reviewDigest = buildDimensionDigest(agentReviews)

  return [
    {
      role: 'system',
      content: `你是在线教育机构的提分策略教研专家。
请使用简体中文回复。

任务：基于教案内容与三维评价结果，生成一份「提分思路」AI建议报告。

硬性约束：
1. 聚焦提分与升学、竞赛支持、密考应对、分数产出优化。
2. 建议必须具体可操作，能转化为在线课堂动作、练习设计或检测方式。
3. 不要提出线下活动、户外实践、家访、线下分组等建议。
4. 必须基于给定教案内容和评价结果，不要写成通用模板。
5. 输出报告正文即可，使用清晰小标题和短段落，不输出 JSON。`,
    },
    {
      role: 'user',
      content: `请为以下教案生成提分思路报告。

【教案标题】
${document.title}

【教案内容】
${documentContent || '暂无教案原文'}

【三维评价与建议】
${reviewDigest || '暂无评价结果'}

请围绕「提分与升学」「竞赛支持」「密考应对」「分数产出优化」给出有针对性的建议。`,
    },
  ]
}

export function buildFallbackTifenReport(document: Document, agentReviews: AgentReview[]) {
  const topSuggestions = agentReviews.flatMap((review) => review.suggestions).slice(0, 4)
  const dimensionLines = agentReviews
    .flatMap((review) => review.dimensions)
    .slice(0, 6)
    .map((dimension) => `- ${dimension.name}：${dimension.comment || `${dimension.score.toFixed(1)} 分，需继续细化提分动作。`}`)

  return [
    `## 提分与升学`,
    `围绕《${document.title}》的当前评审结果，优先把知识点掌握、原理理解和迁移应用转化为可检测的课堂产出。`,
    '',
    `## 竞赛支持与密考应对`,
    dimensionLines.length ? dimensionLines.join('\n') : '- 暂无明确维度评语，建议先补充变式题和限时检测。',
    '',
    `## 分数产出优化`,
    topSuggestions.length
      ? topSuggestions.map((suggestion) => `- ${suggestion.title || '建议'}：${suggestion.content}`).join('\n')
      : '- 建议设置课前诊断、课中变式、课后错因复盘三段检测，确保每个动作都有分数反馈。',
  ].join('\n')
}
