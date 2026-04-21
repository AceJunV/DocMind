import type { Document, TeachingPlanFields } from '@/types'
import { createId } from '@/utils/id'

interface ParseResult {
  raw_content: string
  structured_content: { sections: { title: string; content: string }[] }
  word_count: number
  teaching_plan?: TeachingPlanFields
}

function countWords(text: string): number {
  const cleaned = text.replace(/\s+/g, '')
  return cleaned.length
}

function splitMarkdownSections(text: string): { title: string; content: string }[] {
  const lines = text.split('\n')
  const sections: { title: string; content: string }[] = []
  let currentTitle = '正文'
  let currentLines: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      if (currentLines.length > 0) {
        sections.push({ title: currentTitle, content: currentLines.join('\n').trim() })
      }
      currentTitle = headingMatch[2]
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }
  if (currentLines.length > 0) {
    sections.push({ title: currentTitle, content: currentLines.join('\n').trim() })
  }
  return sections.filter((s) => s.content.length > 0)
}

function splitPlainTextSections(text: string): { title: string; content: string }[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  if (paragraphs.length <= 1) {
    return [{ title: '全文', content: text.trim() }]
  }
  return paragraphs.map((p, i) => {
    const firstLine = p.trim().split('\n')[0].slice(0, 30)
    return { title: `段落 ${i + 1}: ${firstLine}...`, content: p.trim() }
  })
}

function extractTeachingPlanFields(text: string): TeachingPlanFields | undefined {
  const fields: TeachingPlanFields = {}
  let foundAny = false

  const topicMatch = text.match(/(?:课题|课题名称|教学课题)[：:]\s*(.+?)(?:\n|$)/i)
  if (topicMatch) { fields.topic = topicMatch[1].trim(); foundAny = true }

  const subjectMatch = text.match(/(?:学科|科目)[：:]\s*(.+?)(?:\n|$)/i)
  if (subjectMatch) { fields.subject = subjectMatch[1].trim(); foundAny = true }
  else if (/数学|算术|方程|几何|函数|代数/.test(text)) { fields.subject = '数学'; foundAny = true }
  else if (/语文|阅读|写作|作文|诗词|课文/.test(text)) { fields.subject = '语文'; foundAny = true }
  else if (/英语|English|grammar|vocabulary/.test(text)) { fields.subject = '英语'; foundAny = true }

  const gradeMatch = text.match(/(?:年级|班级|学段|适用年级)[：:]\s*(.+?)(?:\n|$)/i)
  if (gradeMatch) { fields.grade = gradeMatch[1].trim(); foundAny = true }
  else {
    const gradeInline = text.match(/(小学|初中|高中|[一二三四五六七八九]年级|[1-9]年级)/)
    if (gradeInline) { fields.grade = gradeInline[1]; foundAny = true }
  }

  const durationMatch = text.match(/(?:课时|课时安排|教学时长)[：:]\s*(.+?)(?:\n|$)/i)
  if (durationMatch) { fields.duration = durationMatch[1].trim(); foundAny = true }

  const objectives: TeachingPlanFields['objectives'] = {}
  let hasObjectives = false

  const knowledgeMatch = text.match(/(?:知识与技能|知识目标|认知目标)[：:]\s*([\s\S]*?)(?=(?:过程与方法|能力目标|情感|态度|教学重点|教学难点|重点|难点|\n\s*\n|$))/i)
  if (knowledgeMatch) { objectives.knowledge = knowledgeMatch[1].trim().replace(/\n/g, '；'); hasObjectives = true }

  const processMatch = text.match(/(?:过程与方法|能力目标|方法目标)[：:]\s*([\s\S]*?)(?=(?:情感|态度|价值观|教学重点|教学难点|重点|难点|\n\s*\n|$))/i)
  if (processMatch) { objectives.process = processMatch[1].trim().replace(/\n/g, '；'); hasObjectives = true }

  const emotionMatch = text.match(/(?:情感态度与价值观|情感目标|情感态度)[：:]\s*([\s\S]*?)(?=(?:教学重点|教学难点|重点|难点|教学过程|\n\s*\n|$))/i)
  if (emotionMatch) { objectives.emotion = emotionMatch[1].trim().replace(/\n/g, '；'); hasObjectives = true }

  if (!hasObjectives) {
    const generalObj = text.match(/(?:教学目标|教学目的)[：:]\s*([\s\S]*?)(?=(?:教学重点|教学难点|重点|难点|教学过程|\n\s*\n|$))/i)
    if (generalObj) { objectives.knowledge = generalObj[1].trim().replace(/\n/g, '；'); hasObjectives = true }
  }

  if (hasObjectives) { fields.objectives = objectives; foundAny = true }

  const keyPointsMatch = text.match(/(?:教学重点|重点)[：:]\s*([\s\S]*?)(?=(?:教学难点|难点|教学过程|教学方法|\n\s*\n|$))/i)
  if (keyPointsMatch) {
    fields.keyPoints = keyPointsMatch[1].trim().split(/[；;。\n]+/).map((s) => s.trim()).filter(Boolean)
    foundAny = true
  }

  const difficultyMatch = text.match(/(?:教学难点|难点)[：:]\s*([\s\S]*?)(?=(?:教学过程|教学方法|教学准备|\n\s*\n|$))/i)
  if (difficultyMatch) {
    fields.difficulties = difficultyMatch[1].trim().split(/[；;。\n]+/).map((s) => s.trim()).filter(Boolean)
    foundAny = true
  }

  const stages: TeachingPlanFields['teachingProcess'] = []
  const stagePatterns = [
    { pattern: /(?:导入|新课导入|情境导入|课堂导入)[：:]\s*([\s\S]*?)(?=(?:新授|新课|讲授|探究|练习|巩固|小结|总结|作业|\n\s*\n|$))/i, stage: '导入' },
    { pattern: /(?:新授|新课讲授|讲授新课|合作探究|探究活动)[：:]\s*([\s\S]*?)(?=(?:练习|巩固|小结|总结|作业|\n\s*\n|$))/i, stage: '新授' },
    { pattern: /(?:练习|巩固练习|课堂练习|当堂检测)[：:]\s*([\s\S]*?)(?=(?:小结|总结|作业|课后|\n\s*\n|$))/i, stage: '练习' },
    { pattern: /(?:小结|课堂小结|课堂总结|归纳总结)[：:]\s*([\s\S]*?)(?=(?:作业|课后|板书|\n\s*\n|$))/i, stage: '小结' },
    { pattern: /(?:作业|课后作业|作业设计|作业布置)[：:]\s*([\s\S]*?)(?=(?:板书|教学反思|反思|\n\s*\n|$))/i, stage: '作业' },
  ]
  for (const { pattern, stage } of stagePatterns) {
    const match = text.match(pattern)
    if (match) {
      stages.push({ stage, content: match[1].trim() })
    }
  }
  if (stages.length > 0) { fields.teachingProcess = stages; foundAny = true }

  const boardMatch = text.match(/(?:板书设计|板书)[：:]\s*([\s\S]*?)(?=(?:教学反思|反思|\n\s*\n|$))/i)
  if (boardMatch) { fields.boardDesign = boardMatch[1].trim(); foundAny = true }

  const reflectionMatch = text.match(/(?:教学反思|课后反思|反思)[：:]\s*([\s\S]*?)$/i)
  if (reflectionMatch) { fields.reflection = reflectionMatch[1].trim(); foundAny = true }

  return foundAny ? fields : undefined
}

async function parseTxt(file: File): Promise<ParseResult> {
  const text = await file.text()
  const sections = splitPlainTextSections(text)
  const teaching_plan = extractTeachingPlanFields(text)
  return {
    raw_content: text,
    structured_content: { sections },
    word_count: countWords(text),
    teaching_plan,
  }
}

async function parseMd(file: File): Promise<ParseResult> {
  const text = await file.text()
  const sections = splitMarkdownSections(text)
  const teaching_plan = extractTeachingPlanFields(text)
  return {
    raw_content: text,
    structured_content: { sections },
    word_count: countWords(text),
    teaching_plan,
  }
}

async function parsePdf(file: File): Promise<ParseResult> {
  const pdfjsLib = await import('pdfjs-dist')
  const pdfWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const textParts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textParts.push(pageText)
  }

  const fullText = textParts.join('\n\n')
  const sections = textParts.map((text, i) => ({
    title: `第 ${i + 1} 页`,
    content: text.trim(),
  })).filter((s) => s.content.length > 0)

  const teaching_plan = extractTeachingPlanFields(fullText)

  return {
    raw_content: fullText,
    structured_content: { sections },
    word_count: countWords(fullText),
    teaching_plan,
  }
}

async function parseDocx(file: File): Promise<ParseResult> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = result.value
  const sections = splitPlainTextSections(text)
  const teaching_plan = extractTeachingPlanFields(text)
  return {
    raw_content: text,
    structured_content: { sections },
    word_count: countWords(text),
    teaching_plan,
  }
}

export async function parseDocument(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'txt':
      return parseTxt(file)
    case 'md':
      return parseMd(file)
    case 'pdf':
      return parsePdf(file)
    case 'docx':
      return parseDocx(file)
    default:
      throw new Error(`不支持的文件格式: .${ext}`)
  }
}

export function createDocumentFromFile(file: File, ownerId: string): Document {
  const ext = file.name.split('.').pop()?.toLowerCase() as Document['file_type']
  const title = file.name.replace(/\.\w+$/, '')
  return {
    id: createId(),
    owner_id: ownerId,
    title,
    file_name: file.name,
    file_type: ext || 'txt',
    file_size: file.size,
    status: 'parsing',
    review_count: 0,
    created_at: new Date().toISOString(),
  }
}

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt']
export const MAX_FILE_SIZE = 20 * 1024 * 1024
