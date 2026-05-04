import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  ClipboardCheck,
  Copy,
  Download,
  Lightbulb,
  MessageCircle,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react'
import { AGENT_COLORS } from '@/stores/agentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'
import { RadarChart } from '@/components/ui/RadarChart'
import { TEACHING_DIMENSIONS, TEACHING_EVAL_DIMENSIONS } from '@/types'
import type { AgentReview, Suggestion } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

const PRIORITY_STYLES = {
  high: { label: '高优先', badge: 'danger' as const, color: 'bg-red-50 text-red-600 border-red-200' },
  medium: { label: '中优先', badge: 'warning' as const, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  low: { label: '低优先', badge: 'success' as const, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
} as const

function buildSuggestionKey(suggestion: Suggestion) {
  return `${suggestion.title || ''}|${suggestion.content}`.toLowerCase().replace(/\s+/g, '')
}

function dedupeSuggestions(items: Suggestion[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = buildSuggestionKey(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function getScoreTone(score?: number) {
  if (score == null) return 'default' as const
  if (score >= 4.2) return 'success' as const
  if (score >= 3.5) return 'warning' as const
  return 'danger' as const
}

type TifenSection = {
  title: string
  paragraphs: string[]
}

function cleanReportLine(line: string) {
  return line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+[.、]\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function formatTifenReport(report: string): TifenSection[] {
  const rawLines = report
    .split(/\r?\n/)
    .map(cleanReportLine)
    .filter((line) => line && !/^[-—]{3,}$/.test(line))

  const sections: TifenSection[] = []
  let current: TifenSection = { title: '提分思路', paragraphs: [] }

  const flush = () => {
    if (current.paragraphs.length > 0 || current.title !== '提分思路') {
      sections.push({
        title: current.title,
        paragraphs: current.paragraphs.map((paragraph) => paragraph.replace(/\s+/g, ' ').trim()).filter(Boolean),
      })
    }
  }

  for (const line of rawLines) {
    const looksLikeTitle =
      line.length <= 24 &&
      !/[。！？；：:，,]/.test(line) &&
      /(提分|升学|竞赛|密考|分数|建议|优化|训练|检测|路径|策略)/.test(line)

    if (looksLikeTitle) {
      flush()
      current = { title: line, paragraphs: [] }
      continue
    }

    current.paragraphs.push(line)
  }
  flush()

  if (sections.length === 0 && rawLines.length > 0) {
    return [{ title: '提分思路', paragraphs: rawLines }]
  }

  return sections.map((section) => ({
    title: section.title,
    paragraphs: section.paragraphs.slice(0, 3),
  }))
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const review = useReviewStore((state) => state.reviews.find((item) => item.id === id))
  const toggleSuggestionAdopted = useReviewStore((state) => state.toggleSuggestionAdopted)
  const reportTopRef = useRef<HTMLDivElement>(null)
  const evidenceRef = useRef<HTMLDivElement>(null)
  const [showKeyInsights, setShowKeyInsights] = useState(true)
  const [activeEvaluationView, setActiveEvaluationView] = useState<'primary' | 'auxiliary'>('primary')
  const [isTifenExpanded, setIsTifenExpanded] = useState(false)
  const [agentDimensionView, setAgentDimensionView] = useState<'primary' | 'auxiliary'>('primary')
  const [activeEvidence, setActiveEvidence] = useState<string | null>(null)
  const agentReviews = useMemo(() => review?.agent_reviews || [], [review?.agent_reviews])
  const completedReviews = useMemo(
    () => agentReviews.filter((item) => item.status !== 'failed'),
    [agentReviews],
  )
  const failedReviews = useMemo(
    () => agentReviews.filter((item) => item.status === 'failed'),
    [agentReviews],
  )
  const reviewAgents = review?.agents
  const teacherReviews = useMemo(
    () => completedReviews.filter((item) => {
      const agent = reviewAgents?.find((candidate) => candidate.id === item.agent_id)
      return !agent?.category || agent.category === 'teacher'
    }),
    [completedReviews, reviewAgents],
  )
  const studentReviews = useMemo(
    () => completedReviews.filter((item) => {
      const agent = reviewAgents?.find((candidate) => candidate.id === item.agent_id)
      return agent?.category === 'student'
    }),
    [completedReviews, reviewAgents],
  )
  const parentReviews = useMemo(
    () => completedReviews.filter((item) => {
      const agent = reviewAgents?.find((candidate) => candidate.id === item.agent_id)
      return agent?.category === 'parent'
    }),
    [completedReviews, reviewAgents],
  )
  const chartDimensions = useMemo(() => {
    const names = completedReviews.flatMap((item) => item.dimensions.map((dimension) => dimension.name))
    const uniqueNames = [...new Set(names)]
    return uniqueNames.length > 0 ? uniqueNames : TEACHING_DIMENSIONS
  }, [completedReviews])
  const radarDatasets = useMemo(
    () =>
      completedReviews.map((item) => {
        const dimensionMap = new Map(item.dimensions.map((dimension) => [dimension.name, dimension.score]))
        return {
          label: item.agent_name,
          color: item.agent_color,
          scores: chartDimensions.map((dimension) => dimensionMap.get(dimension) || 0),
        }
      }),
    [chartDimensions, completedReviews],
  )
  const avgDimScores = useMemo(
    () =>
      chartDimensions.map((dimension) => {
        const scores = completedReviews.map((item) => item.dimensions.find((entry) => entry.name === dimension)?.score || 0)

        if (!scores.length) {
          return { name: dimension, avg: 0, min: 0, max: 0 }
        }

        return {
          name: dimension,
          avg: scores.reduce((sum, score) => sum + score, 0) / scores.length,
          min: Math.min(...scores),
          max: Math.max(...scores),
        }
      }),
    [chartDimensions, completedReviews],
  )
  const hasTeachingEvalDimensions = TEACHING_EVAL_DIMENSIONS.every((dimension) => chartDimensions.includes(dimension))
  const primaryDimensions = useMemo(
    () => hasTeachingEvalDimensions ? TEACHING_EVAL_DIMENSIONS : chartDimensions,
    [chartDimensions, hasTeachingEvalDimensions],
  )
  const auxiliaryDimensions = useMemo(
    () => hasTeachingEvalDimensions
      ? TEACHING_DIMENSIONS.filter((dimension) => chartDimensions.includes(dimension))
      : [],
    [chartDimensions, hasTeachingEvalDimensions],
  )
  const primaryRadarDatasets = useMemo(
    () =>
      completedReviews.map((item) => {
        const dimensionMap = new Map(item.dimensions.map((dimension) => [dimension.name, dimension.score]))
        return {
          label: item.agent_name,
          color: item.agent_color,
          scores: primaryDimensions.map((dimension) => dimensionMap.get(dimension) || 0),
        }
      }),
    [completedReviews, primaryDimensions],
  )
  const auxiliaryRadarDatasets = useMemo(
    () =>
      completedReviews.map((item) => {
        const dimensionMap = new Map(item.dimensions.map((dimension) => [dimension.name, dimension.score]))
        return {
          label: item.agent_name,
          color: item.agent_color,
          scores: auxiliaryDimensions.map((dimension) => dimensionMap.get(dimension) || 0),
        }
      }),
    [auxiliaryDimensions, completedReviews],
  )
  const primaryAvgScores = useMemo(
    () => avgDimScores.filter((dimension) => primaryDimensions.includes(dimension.name as (typeof primaryDimensions)[number])),
    [avgDimScores, primaryDimensions],
  )
  const auxiliaryAvgScores = useMemo(
    () => avgDimScores.filter((dimension) => auxiliaryDimensions.includes(dimension.name as (typeof auxiliaryDimensions)[number])),
    [auxiliaryDimensions, avgDimScores],
  )
  const tifenReport = review?.tifenReport?.trim()
  const tifenSections = useMemo(() => formatTifenReport(tifenReport || ''), [tifenReport])
  const isLongTifenReport = (tifenReport?.length || 0) > 520 || tifenSections.length > 3
  const visibleTifenSections = isLongTifenReport && !isTifenExpanded ? tifenSections.slice(0, 2) : tifenSections
  const dimensionLabel = chartDimensions.length === 3 ? '三维评价' : chartDimensions.length === 6 ? '六维度' : `${chartDimensions.length}维度`
  const isAuxiliaryEvaluation = hasTeachingEvalDimensions && activeEvaluationView === 'auxiliary'
  const activeEvaluationDimensions = isAuxiliaryEvaluation ? auxiliaryDimensions : primaryDimensions
  const activeEvaluationDatasets = isAuxiliaryEvaluation ? auxiliaryRadarDatasets : primaryRadarDatasets
  const activeEvaluationScores = isAuxiliaryEvaluation ? auxiliaryAvgScores : primaryAvgScores
  const activeEvaluationTitle = isAuxiliaryEvaluation ? '六维辅助评价' : hasTeachingEvalDimensions ? '三维评价' : `${dimensionLabel}评价`
  const activeEvaluationDescription = isAuxiliaryEvaluation
    ? '课程设计、知识链、教学目标等二级维度，用于补充定位具体教学问题。'
    : hasTeachingEvalDimensions
      ? '知识掌握、原理理解、迁移应用作为一级核心评分，优先呈现。'
      : '当前报告使用旧维度体系，先按已有评分维度展示。'

  if (!review) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Link to="/reviews" className="flex items-center gap-1 text-sm text-gray-500 no-underline hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> 返回评审大厅
        </Link>
        <Card className="rounded-[28px]">
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="font-medium text-gray-500">评审记录不存在或已被删除</p>
            <Link to="/reviews" className="mt-4 inline-flex no-underline">
              <Button>返回评审大厅</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (review.status === 'in_progress') {
    return (
      <div className="space-y-6 animate-slide-up">
        <Link to="/reviews" className="flex items-center gap-1 text-sm text-gray-500 no-underline hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> 返回评审大厅
        </Link>
        <div className="dm-review-stage-card rounded-[30px] p-[1px]">
          <div className="rounded-[29px] bg-white/96 px-8 py-16 text-center backdrop-blur-xl">
            <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-primary-500" />
            <h2 className="text-xl font-bold text-gray-900">评审正在进行中</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
              角色正在逐步分析文档，建议稍后回来查看完整报告，或返回大厅观察其它评审任务。
            </p>
            <Link to="/reviews" className="mt-6 inline-flex no-underline">
              <Button variant="secondary">返回评审大厅</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const summary = review.summary
  const consensus = summary?.consensus || []
  const controversies = summary?.controversies || []
  const docTitle = review.document?.title || '未知文档'
  const allSuggestions = dedupeSuggestions(completedReviews.flatMap((item) => item.suggestions))
  const prioritySuggestions = dedupeSuggestions(summary?.top_suggestions?.length ? summary.top_suggestions : allSuggestions).slice(0, 10)
  const strengths = (summary?.strengths || []).slice(0, 4)
  const painPoints = (summary?.pain_points || []).slice(0, 4)
  const documentText = review.document?.raw_content || ''
  const normalizedEvidence = activeEvidence?.trim() || ''
  const evidenceIndex = normalizedEvidence ? documentText.indexOf(normalizedEvidence) : -1
  const evidenceContext = normalizedEvidence && documentText
    ? evidenceIndex < 0
      ? documentText.slice(0, 800)
      : documentText.slice(Math.max(0, evidenceIndex - 260), Math.min(documentText.length, evidenceIndex + normalizedEvidence.length + 360))
    : ''

  const scrollToEvidence = (evidence: string) => {
    setActiveEvidence(evidence)
    window.setTimeout(() => evidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  const scrollBackToReport = () => {
    reportTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const buildReportMarkdown = () => {
    const lines = [
      `# 《${docTitle}》教研评审报告`,
      '',
      `- **评审时间**：${new Date(review.created_at).toLocaleDateString('zh-CN')}`,
      `- **参与角色总数**：${agentReviews.length}`,
      `- **成功生成**：${completedReviews.length}`,
      `- **生成失败**：${failedReviews.length}`,
      `- **综合评分**：${review.overall_score?.toFixed(1) || '-'}`,
      '',
    ]

    if (summary?.overview) {
      lines.push('## 总体诊断', '', summary.overview, '')
    }

    if (strengths.length > 0) {
      lines.push('## 核心亮点', '', ...strengths.map((item) => `- ${item}`), '')
    }

    if (painPoints.length > 0) {
      lines.push('## 关键痛点', '', ...painPoints.map((item) => `- ${item}`), '')
    }

    if (completedReviews.length > 0) {
      lines.push(
        `## ${dimensionLabel}评分概览`,
        '',
        '| 维度 | 平均分 | 最低分 | 最高分 |',
        '|------|--------|--------|--------|',
        ...avgDimScores.map((item) => `| ${item.name} | ${item.avg.toFixed(1)} | ${item.min.toFixed(1)} | ${item.max.toFixed(1)} |`),
        ''
      )
    }

    if (prioritySuggestions.length > 0) {
      lines.push('## 优先优化建议', '')
      lines.push(
        ...prioritySuggestions.flatMap((suggestion, index) => [
          `### ${index + 1}. ${suggestion.title || '建议'}`,
          '',
          `- **优先级**：${PRIORITY_STYLES[suggestion.priority].label}`,
          `- **内容**：${suggestion.content}`,
          `- **来源**：${suggestion.source_agent}`,
          ...(suggestion.evidence ? [`- **证据**：${suggestion.evidence}`] : []),
          ...(suggestion.expected_effect ? [`- **预期收益**：${suggestion.expected_effect}`] : []),
          '',
        ])
      )
    }

    if (consensus.length > 0) {
      lines.push('## 多方共识', '', ...consensus.map((item) => `- ${item}`), '')
    }

    if (controversies.length > 0) {
      lines.push('## 争议点', '')
      lines.push(
        ...controversies.flatMap((item) => [
          `### ${item.topic}`,
          ...item.opinions.map((opinion) => `- **${opinion.agent_name}**：${opinion.stance}`),
          '',
        ])
      )
    }

    if (completedReviews.length > 0) {
      lines.push('## 分角色评审观点', '')
      lines.push(
        ...completedReviews.flatMap((item) => [
          `### ${item.agent_name} - ${item.score.toFixed(1)} 分`,
          '',
          item.opinion,
          '',
          '**维度评分**',
          ...item.dimensions.map((dimension) =>
            `- ${dimension.name}: ${dimension.score.toFixed(1)}/5${dimension.comment ? ` - ${dimension.comment}` : ''}`
          ),
          '',
          ...(item.highlights?.length ? ['**亮点**', ...item.highlights.map((highlight) => `- ${highlight}`), ''] : []),
        ])
      )
    }

    if (failedReviews.length > 0) {
      lines.push('## 生成失败角色', '')
      lines.push(
        ...failedReviews.flatMap((item) => [
          `### ${item.agent_name}`,
          '',
          `- **原因**：${item.error_message || '未返回错误信息'}`,
          '',
        ])
      )
    }

    return lines.join('\n')
  }

  const handleExport = () => {
    const text = buildReportMarkdown()
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `教研评审报告_${docTitle}_${new Date(review.created_at).toLocaleDateString('zh-CN')}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast('success', '教研评审报告已下载')
  }

  const handleExportImage = () => {
    const canvas = document.createElement('canvas')
    const width = 1400
    const height = 1800
    const padding = 72
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(36, 36, width - 72, height - 72)
    ctx.strokeStyle = '#e5e7eb'
    ctx.strokeRect(36, 36, width - 72, height - 72)

    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const chars = text.split('')
      let line = ''
      let nextY = y
      chars.forEach((char) => {
        const testLine = line + char
        if (ctx.measureText(testLine).width > maxWidth && line) {
          ctx.fillText(line, x, nextY)
          line = char
          nextY += lineHeight
        } else {
          line = testLine
        }
      })
      if (line) {
        ctx.fillText(line, x, nextY)
        nextY += lineHeight
      }
      return nextY
    }

    let y = padding
    ctx.fillStyle = '#111827'
    ctx.font = 'bold 38px sans-serif'
    y = wrapText(`《${docTitle}》教研评审报告`, padding, y, width - padding * 2, 48)
    ctx.font = '18px sans-serif'
    ctx.fillStyle = '#4b5563'
    y = wrapText(`综合评分：${review.overall_score?.toFixed(1) || '-'}    成功角色：${completedReviews.length}    生成失败：${failedReviews.length}`, padding, y + 8, width - padding * 2, 30)

    if (summary?.overview) {
      ctx.fillStyle = '#111827'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText('总体诊断', padding, y + 32)
      ctx.font = '18px sans-serif'
      ctx.fillStyle = '#374151'
      y = wrapText(summary.overview, padding, y + 64, width - padding * 2, 30)
    }

    const radarCenterX = padding + 220
    const radarCenterY = y + 190
    const radius = 130
    if (avgDimScores.length > 0) {
      ctx.strokeStyle = '#d1d5db'
      ctx.fillStyle = '#4b5563'
      ctx.font = '15px sans-serif'
      avgDimScores.forEach((item, index) => {
        const angle = (Math.PI * 2 * index) / avgDimScores.length - Math.PI / 2
        const x = radarCenterX + Math.cos(angle) * radius
        const pointY = radarCenterY + Math.sin(angle) * radius
        ctx.beginPath()
        ctx.moveTo(radarCenterX, radarCenterY)
        ctx.lineTo(x, pointY)
        ctx.stroke()
        ctx.fillText(item.name, x - 24, pointY + (pointY > radarCenterY ? 24 : -12))
      })
      ctx.beginPath()
      avgDimScores.forEach((item, index) => {
        const angle = (Math.PI * 2 * index) / avgDimScores.length - Math.PI / 2
        const scoreRadius = radius * (item.avg / 5)
        const x = radarCenterX + Math.cos(angle) * scoreRadius
        const pointY = radarCenterY + Math.sin(angle) * scoreRadius
        if (index === 0) ctx.moveTo(x, pointY)
        else ctx.lineTo(x, pointY)
      })
      ctx.closePath()
      ctx.fillStyle = 'rgba(99, 102, 241, 0.24)'
      ctx.fill()
      ctx.strokeStyle = '#6366f1'
      ctx.stroke()

      ctx.fillStyle = '#111827'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(`${dimensionLabel}雷达图`, padding, y + 24)
      ctx.font = '18px sans-serif'
      ctx.fillStyle = '#374151'
      avgDimScores.forEach((item, index) => {
        ctx.fillText(`${item.name}：${item.avg.toFixed(1)}/5`, padding + 520, y + 80 + index * 30)
      })
      y += 360
    }

    ctx.fillStyle = '#111827'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('核心问题', padding, y)
    ctx.font = '18px sans-serif'
    ctx.fillStyle = '#374151'
    y += 34
    ;(painPoints.length ? painPoints.slice(0, 3) : ['暂无明确痛点汇总']).forEach((item, index) => {
      y = wrapText(`${index + 1}. ${item}`, padding, y, width - padding * 2, 30)
    })

    ctx.fillStyle = '#111827'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('优先建议', padding, y + 28)
    ctx.font = '18px sans-serif'
    ctx.fillStyle = '#374151'
    y += 64
    prioritySuggestions.slice(0, 5).forEach((suggestion, index) => {
      y = wrapText(`${index + 1}. ${suggestion.title || '建议'}：${suggestion.content}`, padding, y, width - padding * 2, 30)
    })

    const link = document.createElement('a')
    link.download = `教研评审报告_${docTitle}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast('success', '教研评审报告图片已下载')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReportMarkdown())
      toast('success', '评审报告已复制到剪贴板')
    } catch {
      toast('error', '复制失败，请手动复制')
    }
  }

  const handleCreateChat = () => {
    navigate(`/chat?review=${review.id}`)
  }

  const renderAgentCards = (items: AgentReview[], title: string, icon: string) => {
    if (items.length === 0) return null
    const displayDimensions = (item: AgentReview) => {
      if (!hasTeachingEvalDimensions) return item.dimensions
      const names = agentDimensionView === 'primary' ? TEACHING_EVAL_DIMENSIONS : TEACHING_DIMENSIONS
      return names
        .map((name) => item.dimensions.find((dimension) => dimension.name === name))
        .filter((dimension): dimension is AgentReview['dimensions'][number] => Boolean(dimension))
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
            <Badge variant="default">{items.length}</Badge>
          </div>
          {hasTeachingEvalDimensions ? (
            <div className="flex rounded-full border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => setAgentDimensionView('primary')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  agentDimensionView === 'primary' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                三维
              </button>
              <button
                onClick={() => setAgentDimensionView('auxiliary')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  agentDimensionView === 'auxiliary' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                六维
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {items.map((item) => {
            const agent = review.agents?.find((candidate) => candidate.id === item.agent_id)

            return (
              <Card
                key={item.agent_id}
                className="rounded-[24px]"
                style={{ borderLeftColor: AGENT_COLORS[item.agent_color], borderLeftWidth: '3px' }}
              >
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                        style={{ backgroundColor: `${AGENT_COLORS[item.agent_color]}15` }}
                      >
                        {agent?.avatar || item.agent_name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{item.agent_name}</p>
                          {agent?.focusDimension ? <Badge variant="warning">{agent.focusDimension}</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{agent?.tagline || '角色评审视角'}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: AGENT_COLORS[item.agent_color] }}>
                        {item.score.toFixed(1)}
                      </p>
                      <Badge variant={getScoreTone(item.score)}>角色评分</Badge>
                    </div>
                  </div>

                  <p className="mb-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{item.opinion}</p>

                  {item.highlights?.length ? (
                    <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50/70 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">角色提炼亮点</p>
                      <div className="space-y-1.5">
                        {item.highlights.slice(0, 3).map((highlight) => (
                          <p key={highlight} className="text-sm text-gray-700">{highlight}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    {displayDimensions(item).map((dimension) => (
                      <div key={dimension.name} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-700">{dimension.name}</span>
                          <span className="text-gray-500">{dimension.score.toFixed(1)}/5</span>
                        </div>
                        <div className="mb-3 h-1.5 rounded-full bg-white">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${dimension.score * 20}%`, backgroundColor: AGENT_COLORS[item.agent_color] }}
                          />
                        </div>
                        {dimension.comment ? <p className="text-xs leading-6 text-gray-600">{dimension.comment}</p> : null}
                        {dimension.evidence ? (
                          <button
                            onClick={() => scrollToEvidence(dimension.evidence || '')}
                            className="mt-3 w-full rounded-xl border border-primary-100 bg-white px-3 py-2 text-left text-xs leading-5 text-primary-700 transition-colors hover:bg-primary-50"
                          >
                            证据：{dimension.evidence}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={reportTopRef} className="space-y-6 animate-slide-up">
      <Link to="/reviews" className="flex items-center gap-1 text-sm text-gray-500 no-underline hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> 返回评审大厅
      </Link>

      <section className="dm-hero-card rounded-[30px] px-6 py-6 sm:px-8 dm-stage-reveal" style={{ ['--reveal-delay' as string]: '0ms' }}>
        <div className="relative z-[1] space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="dm-kicker">
                <Sparkles className="h-3.5 w-3.5" />
                Review Report Ready
              </span>
              <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                《{docTitle}》教研评审报告
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">
                这不是一堆零散意见，而是从多角色分析中压缩出的结果阅读态。先看总体诊断和关键痛点，再往下读建议、共识、争议和分角色细评。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCreateChat}>
                <MessageCircle className="h-4 w-4" />
                教研研讨
              </Button>
              <Button variant="secondary" onClick={handleExport}>
                <Download className="h-4 w-4" />
                下载 Markdown
              </Button>
              <Button variant="secondary" onClick={handleExportImage}>
                <Download className="h-4 w-4" />
                导出图片
              </Button>
              <Button variant="secondary" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                复制
              </Button>
              <Link to={`/reviews/create?doc=${review.document_id}`} className="no-underline">
                <Button variant="secondary">
                  <RefreshCw className="h-4 w-4" />
                  重新评审
                </Button>
              </Link>
            </div>
          </div>

          {summary?.overview ? (
            <div className="rounded-[24px] border border-primary-100 bg-white/76 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">总体诊断</p>
              <p className="mt-2 text-sm leading-7 text-gray-700">{summary.overview}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dm-stage-reveal" style={{ ['--reveal-delay' as string]: '40ms' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">Key Insights</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">核心提炼</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowKeyInsights((previous) => !previous)}>
            {showKeyInsights ? '收起' : '展开'}
          </Button>
        </div>
        {showKeyInsights ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <p className="mb-3 text-sm font-semibold text-amber-700">3 个核心问题</p>
              <div className="space-y-2">
                {(painPoints.length ? painPoints.slice(0, 3) : ['暂无明确痛点汇总']).map((item, index) => (
                  <p key={item} className="text-sm leading-7 text-gray-700">{index + 1}. {item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
              <p className="mb-3 text-sm font-semibold text-emerald-700">2-3 个保留亮点</p>
              <div className="space-y-2">
                {(strengths.length ? strengths.slice(0, 3) : ['暂无明确亮点汇总']).map((item, index) => (
                  <p key={item} className="text-sm leading-7 text-gray-700">{index + 1}. {item}</p>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {activeEvidence ? (
        <section ref={evidenceRef} className="rounded-[28px] border border-primary-200 bg-primary-50/70 p-5 shadow-sm dm-stage-reveal" style={{ ['--reveal-delay' as string]: '80ms' }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">Evidence Locator</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">原文证据定位</h2>
            </div>
            <Button variant="secondary" size="sm" onClick={scrollBackToReport}>返回报告</Button>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="mb-3 text-sm font-medium text-primary-700">当前证据：{activeEvidence}</p>
            <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {evidenceContext || '当前文档没有可定位的原文内容。'}
            </p>
          </div>
        </section>
      ) : null}

      {failedReviews.length > 0 ? (
        <section className="rounded-[28px] border border-red-200 bg-red-50/70 p-5 dm-stage-reveal" style={{ ['--reveal-delay' as string]: '80ms' }}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-red-700">
            <XCircle className="h-5 w-5" />
            生成失败角色 ({failedReviews.length})
          </h2>
          <div className="space-y-2">
            {failedReviews.map((item) => (
              <div key={item.agent_id} className="rounded-2xl border border-red-100 bg-white/70 p-3 text-sm text-red-700">
                <p className="font-medium">{item.agent_name}</p>
                <p className="mt-1 text-xs text-red-600">{item.error_message || '未返回错误信息'}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr] dm-stage-reveal" style={{ ['--reveal-delay' as string]: '120ms' }}>
        <Card className="rounded-[28px]">
          <CardContent className="p-6">
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Scoreboard</p>
                <p className="mt-2 text-5xl font-bold text-gray-900">{review.overall_score?.toFixed(1) || '-'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={getScoreTone(review.overall_score)}>{review.overall_score && review.overall_score >= 4.2 ? '诊断成熟' : review.overall_score && review.overall_score >= 3.5 ? '可继续强化' : '优先修正'}</Badge>
                  <Badge variant="default">成功 {completedReviews.length}</Badge>
                  <Badge variant="default">失败 {failedReviews.length}</Badge>
                </div>
                <div className="rounded-[24px] border border-gray-100 bg-gray-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Quick Read</p>
                  <div className="mt-3 space-y-2">
                    {(painPoints.slice(0, 2).length ? painPoints.slice(0, 2) : ['当前报告已经生成，可继续查看下方建议与分角色判断。']).map((item) => (
                      <p key={item} className="text-sm leading-7 text-gray-700">{item}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-gray-100 bg-gray-50/80 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-700">{dimensionLabel}均值</p>
                <div className="space-y-2">
                  {avgDimScores.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <span className="w-16 shrink-0 text-right text-gray-500">{item.name}</span>
                      <div className="h-2 flex-1 rounded-full bg-white">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${item.avg * 20}%` }} />
                      </div>
                      <span className="w-6 text-right font-medium text-gray-600">{item.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-[11px] text-gray-500">共识</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{consensus.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-[11px] text-gray-500">争议</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{controversies.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3">
                    <p className="text-[11px] text-gray-500">建议</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{prioritySuggestions.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {radarDatasets.length > 0 ? (
          <Card className={cn('rounded-[28px]', hasTeachingEvalDimensions && 'border-primary-200 bg-primary-50/30')}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">Evaluation</p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">{activeEvaluationTitle}</h2>
                  <p className="mt-1 text-xs leading-6 text-gray-500">
                    {activeEvaluationDescription}
                  </p>
                </div>
                {hasTeachingEvalDimensions ? (
                  <div className="flex shrink-0 rounded-full border border-primary-100 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setActiveEvaluationView('primary')}
                      className={cn(
                        'rounded-full border-0 px-4 py-1.5 text-xs font-semibold transition-colors',
                        activeEvaluationView === 'primary'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-transparent text-gray-600 hover:text-primary-700'
                      )}
                    >
                      三维主评
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEvaluationView('auxiliary')}
                      disabled={auxiliaryDimensions.length === 0}
                      className={cn(
                        'rounded-full border-0 px-4 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                        activeEvaluationView === 'auxiliary'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-transparent text-gray-600 hover:text-primary-700'
                      )}
                    >
                      六维辅助
                    </button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 p-6 xl:grid-cols-[1fr_0.95fr]">
              {activeEvaluationDimensions.length > 0 ? (
                <>
                  <div className="flex justify-center">
                    <RadarChart datasets={activeEvaluationDatasets} dimensions={activeEvaluationDimensions} size={isAuxiliaryEvaluation ? 300 : 320} />
                  </div>
                  <div className={cn('space-y-3', isAuxiliaryEvaluation && 'grid gap-3 space-y-0 sm:grid-cols-2 xl:block xl:space-y-3')}>
                    {activeEvaluationScores.map((item) => (
                      <div key={item.name} className="rounded-2xl border border-primary-100 bg-white px-4 py-3">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-gray-800">{item.name}</span>
                          <span className="shrink-0 font-bold text-primary-700">{item.avg.toFixed(1)}/5</span>
                        </div>
                        <div className="h-2 rounded-full bg-primary-50">
                          <div className="h-full rounded-full bg-primary-500" style={{ width: `${item.avg * 20}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 xl:col-span-2">
                  当前报告没有生成六维辅助评分数据。
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      {tifenReport ? (
        <section className="dm-stage-reveal" style={{ ['--reveal-delay' as string]: '165ms' }}>
          <Card className="relative overflow-hidden rounded-[28px] border-primary-200 bg-white">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">AI Suggestion Report</p>
                <h2 className="mt-1 text-base font-semibold text-gray-900">提分思路</h2>
                <p className="mt-1 text-xs leading-6 text-gray-500">按中文短报告规整呈现，长内容默认收起，便于快速阅读。</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="primary">AI建议报告</Badge>
                {isLongTifenReport ? (
                  <Button variant="secondary" size="sm" onClick={() => setIsTifenExpanded((previous) => !previous)}>
                    {isTifenExpanded ? '收起' : '展开全文'}
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className={cn('space-y-5', isLongTifenReport && !isTifenExpanded && 'max-h-72 overflow-hidden')}>
                {visibleTifenSections.map((section, index) => (
                  <article key={`${section.title}-${index}`} className="border-l-2 border-primary-200 pl-4">
                    <h3 className="text-sm font-semibold text-gray-950">{section.title}</h3>
                    <div className="mt-2 space-y-2">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="text-[15px] leading-8 text-gray-700">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              {isLongTifenReport && !isTifenExpanded ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-white/0" />
              ) : null}
              {isLongTifenReport ? (
                <div className="relative mt-5 flex justify-center">
                  <Button variant="secondary" size="sm" onClick={() => setIsTifenExpanded((previous) => !previous)}>
                    {isTifenExpanded ? '收起提分思路' : '展开完整提分思路'}
                  </Button>
                </div>
              ) : null}
              {isLongTifenReport && isTifenExpanded ? (
                <button
                  onClick={() => setIsTifenExpanded(false)}
                  className="sticky bottom-5 float-right mt-4 rounded-full border border-primary-200 bg-white/95 px-4 py-2 text-xs font-semibold text-primary-700 shadow-lg backdrop-blur transition-colors hover:bg-primary-50"
                >
                  收起
                </button>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 dm-stage-reveal" style={{ ['--reveal-delay' as string]: '180ms' }}>
        <Card className="rounded-[28px] border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              核心亮点
            </h2>
            <div className="space-y-2">
              {(strengths.length ? strengths : ['暂无明确亮点汇总']).map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-amber-200 bg-amber-50/50">
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <TriangleAlert className="h-5 w-5 text-amber-500" />
              关键痛点
            </h2>
            <div className="space-y-2">
              {(painPoints.length ? painPoints : ['暂无明确痛点汇总']).map((item) => (
                <p key={item} className="text-sm leading-7 text-gray-700">{item}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-primary-200 bg-primary-50/50">
          <CardContent className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Users className="h-5 w-5 text-primary-500" />
              多角色结论
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">共识</p>
                <div className="space-y-1.5">
                  {(consensus.length ? consensus : ['暂无明显共识']).map((item) => (
                    <p key={item} className="text-sm leading-6 text-gray-700">{item}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">争议</p>
                <div className="space-y-1.5">
                  {(controversies.length
                    ? controversies.map((item) => `${item.topic}：${item.opinions.map((opinion) => `${opinion.agent_name}认为${opinion.stance}`).join('；')}`)
                    : ['暂无明显争议']).map((item) => (
                    <p key={item} className="text-sm leading-6 text-gray-700">{item}</p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {prioritySuggestions.length > 0 ? (
        <section className="dm-stage-reveal" style={{ ['--reveal-delay' as string]: '240ms' }}>
          <Card className="rounded-[28px]">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">优先优化建议</h2>
                    <p className="mt-1 text-xs text-gray-500">这里保留的是压缩后的高价值建议，不追求数量，追求可执行。</p>
                  </div>
                </div>
                <Badge variant="default">{prioritySuggestions.length} 条</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {prioritySuggestions.map((suggestion) => {
                  const priority = PRIORITY_STYLES[suggestion.priority]

                  return (
                    <div key={suggestion.id} className="rounded-[24px] border border-gray-100 p-4 transition-colors hover:bg-gray-50">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-gray-900">{suggestion.title || '建议'}</p>
                          <p className="mt-1 text-xs text-gray-400">来自 {suggestion.source_agent}</p>
                        </div>
                        <Badge variant={priority.badge}>{priority.label}</Badge>
                      </div>

                      <p className={cn('text-sm leading-7 text-gray-700', suggestion.adopted && 'line-through text-gray-400')}>
                        {suggestion.content}
                      </p>

                      {suggestion.evidence ? (
                        <div className="mt-3 rounded-2xl bg-gray-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">证据</p>
                          <button
                            onClick={() => scrollToEvidence(suggestion.evidence || '')}
                            className="mt-1 w-full rounded-xl border border-transparent px-0 py-1 text-left text-sm leading-7 text-primary-700 transition-colors hover:border-primary-100 hover:bg-white hover:px-3"
                          >
                            {suggestion.evidence}
                          </button>
                        </div>
                      ) : null}

                      {suggestion.expected_effect ? (
                        <div className="mt-3 rounded-2xl bg-primary-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-600">预期收益</p>
                          <p className="mt-1 text-sm leading-7 text-gray-700">{suggestion.expected_effect}</p>
                        </div>
                      ) : null}

                      <div className="mt-4 flex justify-end">
                        <Button
                          variant={suggestion.adopted ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => toggleSuggestionAdopted(review.id, suggestion.id)}
                        >
                          {suggestion.adopted ? '已采纳' : '采纳'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {completedReviews.length > 0 ? (
        <section className="space-y-6 dm-stage-reveal" style={{ ['--reveal-delay' as string]: '300ms' }}>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">各角色评审观点</h2>
          </div>

          {renderAgentCards(teacherReviews, '教师视角', '👩‍🏫')}
          {renderAgentCards(studentReviews, '学生视角', '🧑‍🎓')}
          {renderAgentCards(parentReviews, '家长视角', '👨‍👩‍👧')}
        </section>
      ) : null}

      {activeEvidence ? (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm rounded-2xl border border-primary-200 bg-white p-4 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-600">证据高亮</p>
          <p className="mt-2 max-h-24 overflow-y-auto text-sm leading-6 text-gray-700">{activeEvidence}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={scrollBackToReport}>返回</Button>
            <Button size="sm" onClick={() => evidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>查看原文</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
