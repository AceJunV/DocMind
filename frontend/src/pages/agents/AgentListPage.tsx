import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Bot, Trash2, X, RotateCcw, Recycle,
  Download, Upload, Sparkles, Check, Dices, Send, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgentStore, AGENT_COLORS, createAgentFromTemplate } from '@/stores/agentStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { isModelConfigValid } from '@/stores/settingsStore'
import { chatCompletion, LLMError } from '@/services/llmService'
import { toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { createId } from '@/utils/id'
import type { Agent, AgentTemplate, AgentColor, AgentCategory, TeachingDimension } from '@/types'
import { TEACHING_DIMENSIONS } from '@/types'

const ALL_COLORS: AgentColor[] = ['indigo', 'violet', 'pink', 'orange', 'teal', 'sky', 'slate', 'green', 'rose', 'amber', 'emerald', 'cyan']

// ======================== Preset Detail Modal (read-only) ========================

function PresetDetailModal({ template, onClose }: { template: AgentTemplate; onClose: () => void }) {
  const borderColor = AGENT_COLORS[template.color]
  const categoryName = CATEGORY_OPTIONS.find((o) => o.value === template.category)?.label || template.category

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl mx-4 max-h-[85vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full text-xl shrink-0"
              style={{ backgroundColor: borderColor + '15', boxShadow: `0 0 0 2px ${borderColor}` }}>
              {template.avatar}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <p className="text-xs text-gray-500">{template.tagline}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600 border border-primary-200">官方</span>
            <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">{categoryName}</span>
            {template.focusDimension && (
              <span className="rounded-full px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">{template.focusDimension}</span>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">角色简介</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">专长领域</h4>
            <div className="flex flex-wrap gap-1.5">
              {template.expertise.map((e) => (
                <span key={e} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: borderColor + '15', color: borderColor }}>{e}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">性格特征</h4>
            <div className="space-y-2">
              {[
                { label: '直接度', value: template.personality.directness },
                { label: '严格度', value: template.personality.strictness },
                { label: '幽默感', value: template.personality.humor },
                { label: '共情力', value: template.personality.empathy },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-12">{item.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${item.value * 20}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{item.value}/5</span>
                </div>
              ))}
            </div>
          </div>
          {template.behavior.style && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">说话风格</h4>
              <p className="text-sm text-gray-600">{template.behavior.style}</p>
            </div>
          )}
          {template.behavior.catchphrase && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">口头禅</h4>
              <p className="text-sm text-gray-600 italic">「{template.behavior.catchphrase}」</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const CATEGORY_OPTIONS: { value: AgentCategory; label: string; icon: string }[] = [
  { value: 'teacher', label: '教研老师', icon: '👨‍🏫' },
  { value: 'student', label: '学生', icon: '🎒' },
  { value: 'parent', label: '家长', icon: '👨‍👩‍👧' },
]

// === MD Import/Export ===

function exportAgentToMD(agent: Agent): string {
  const lines: string[] = [
    '---',
    `name: "${agent.name}"`,
    `avatar: "${agent.avatar || ''}"`,
    `tagline: "${agent.tagline}"`,
    `color: ${agent.color}`,
  ]
  if (agent.category) lines.push(`category: ${agent.category}`)
  if (agent.focusDimension) lines.push(`focusDimension: ${agent.focusDimension}`)
  lines.push(`source: ${agent.source}`)
  lines.push('expertise:')
  for (const e of agent.expertise) lines.push(`  - "${e}"`)
  lines.push('personality:')
  lines.push(`  directness: ${agent.personality.directness}`)
  lines.push(`  strictness: ${agent.personality.strictness}`)
  lines.push(`  humor: ${agent.personality.humor}`)
  lines.push(`  empathy: ${agent.personality.empathy}`)
  lines.push('behavior:')
  lines.push(`  style: "${agent.behavior.style}"`)
  if (agent.behavior.catchphrase) lines.push(`  catchphrase: "${agent.behavior.catchphrase}"`)
  lines.push('---')
  lines.push('')
  lines.push('## 人物设定')
  lines.push('')
  lines.push(agent.system_prompt)
  return lines.join('\n')
}

function parseAgentMD(md: string): Partial<Agent> | null {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return null
  const fm = fmMatch[1]
  const body = md.slice(fmMatch[0].length).trim()

  const getStr = (key: string): string => {
    const m = fm.match(new RegExp(`^${key}:\\s*"?(.+?)"?\\s*$`, 'm'))
    return m ? m[1].replace(/^"|"$/g, '') : ''
  }
  const getNum = (key: string): number => {
    const m = fm.match(new RegExp(`^${key}:\\s*(\\d+)`, 'm'))
    return m ? parseInt(m[1], 10) : 3
  }

  const expertiseMatch = fm.match(/expertise:\n((?:\s+- ".+"\n?)+)/)
  const expertise = expertiseMatch
    ? [...expertiseMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
    : []

  const systemPrompt = body.replace(/^##\s*人物设定\s*\n?/, '').trim()

  const colorVal = getStr('color')
  const categoryVal = getStr('category')

  return {
    name: getStr('name'),
    avatar: getStr('avatar'),
    tagline: getStr('tagline'),
    color: ALL_COLORS.includes(colorVal as AgentColor) ? (colorVal as AgentColor) : 'indigo',
    category: ['teacher', 'student', 'parent'].includes(categoryVal) ? (categoryVal as AgentCategory) : undefined,
    focusDimension: (TEACHING_DIMENSIONS as readonly string[]).includes(getStr('focusDimension')) ? (getStr('focusDimension') as TeachingDimension) : undefined,
    source: (getStr('source') === 'template' ? 'template' : 'custom') as Agent['source'],
    expertise,
    personality: {
      directness: Math.min(5, Math.max(1, getNum('directness'))),
      strictness: Math.min(5, Math.max(1, getNum('strictness'))),
      humor: Math.min(5, Math.max(1, getNum('humor'))),
      empathy: Math.min(5, Math.max(1, getNum('empathy'))),
    },
    behavior: {
      style: getStr('style'),
      catchphrase: getStr('catchphrase') || undefined,
    },
    system_prompt: systemPrompt,
  }
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ======================== Recommend Tab ========================

// ======================== Agent Manage Card ========================

function AgentManageCard({ agent, onEdit, onDelete, onExport, onImport, onToggleVisibility }: {
  agent: Agent; onEdit: () => void; onDelete: () => void; onExport: () => void; onImport: () => void; onToggleVisibility: () => void
}) {
  const borderColor = AGENT_COLORS[agent.color]
  const isVisible = agent.visibleInReview !== false
  return (
    <div
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
      onClick={onEdit}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shrink-0"
          style={{ backgroundColor: borderColor + '15', boxShadow: `0 0 0 2px ${borderColor}` }}
        >
          {agent.avatar || agent.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{agent.name}</h3>
          <p className="text-xs text-gray-500">{agent.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {agent.expertise.slice(0, 4).map((e) => (
          <span key={e} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: borderColor + '15', color: borderColor }}>
            {e}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {agent.source === 'template' ? '来自模板' : agent.source === 'custom' ? '自定义创建' : '社区'}
        {' · '}已使用 {agent.usage_count} 次
        {agent.category && (
          <> · {{ teacher: '教研老师', student: '学生', parent: '家长' }[agent.category]}</>
        )}
      </p>
      <div className="flex items-center justify-between border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" checked={isVisible} onChange={onToggleVisibility}
            className="peer sr-only" />
          <div className={cn(
            'h-5 w-9 rounded-full after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all',
            isVisible ? 'bg-primary-600 after:translate-x-4' : 'bg-gray-300'
          )}></div>
          <span className={cn('ml-2 text-xs font-medium', isVisible ? 'text-primary-600' : 'text-gray-400')}>
            {isVisible ? '参与评审' : '不参与评审'}
          </span>
        </label>
        <div className="flex gap-2">
          {agent.source !== 'template' && (
            <button
              onClick={onImport}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
              title="导入 MD 文档覆盖当前角色"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onExport}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer bg-white"
            title="导出为 MD 文档"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer bg-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ======================== Preset Add Modal ========================

function PresetAddModal({ initialTemplate, onClose, onSaved, embedded }: {
  initialTemplate?: AgentTemplate; onClose: () => void; onSaved: () => void; embedded?: boolean
}) {
  const { user } = useAuthStore()
  const templates = useAgentStore((s) => s.templates)
  const agents = useAgentStore((s) => s.agents)
  const addAgent = useAgentStore((s) => s.addAgent)

  const visibleTemplates = templates
  const [selectedTpl, setSelectedTpl] = useState<AgentTemplate | null>(initialTemplate || null)
  const [step, setStep] = useState<'select' | 'edit'>(initialTemplate ? 'edit' : 'select')

  // Editable fields
  const [name, setName] = useState(initialTemplate?.name || '')
  const [tagline, setTagline] = useState(initialTemplate?.tagline || '')
  const [avatar, setAvatar] = useState(initialTemplate?.avatar || '')
  const [color, setColor] = useState<AgentColor>(initialTemplate?.color || 'indigo')
  const [expertise, setExpertise] = useState(initialTemplate?.expertise.join('、') || '')
  const [directness, setDirectness] = useState(initialTemplate?.personality.directness || 3)
  const [strictness, setStrictness] = useState(initialTemplate?.personality.strictness || 3)
  const [humor, setHumor] = useState(initialTemplate?.personality.humor || 3)
  const [empathy, setEmpathy] = useState(initialTemplate?.personality.empathy || 3)

  const selectTemplate = (template: AgentTemplate) => {
    setSelectedTpl(template)
    setName(template.name)
    setTagline(template.tagline)
    setAvatar(template.avatar || '')
    setColor(template.color)
    setExpertise(template.expertise.join('、'))
    setDirectness(template.personality.directness)
    setStrictness(template.personality.strictness)
    setHumor(template.personality.humor)
    setEmpathy(template.personality.empathy)
    setStep('edit')
  }

  const handleSave = () => {
    if (!selectedTpl || !name.trim()) return
    const agent = createAgentFromTemplate(selectedTpl, user?.id || '')
    // Apply user edits
    agent.name = name.trim()
    agent.tagline = tagline.trim()
    agent.avatar = avatar.trim() || name.trim()[0]
    agent.color = color
    agent.expertise = expertise.split(/[、,，]/).map((s) => s.trim()).filter(Boolean)
    agent.personality = { directness, strictness, humor, empathy }
    addAgent(agent)
    toast('success', `已添加角色「${name.trim()}」到你的评审团`)
    onSaved()
  }

  const borderColor = AGENT_COLORS[color]

  const innerContent = (
    <>
      {step === 'select' ? (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
{visibleTemplates.map((tpl) => {
                const bc = AGENT_COLORS[tpl.color]
                return (
                  <button
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl)}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-sm bg-white p-3 text-left transition-all cursor-pointer"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xl shrink-0"
                      style={{ backgroundColor: bc + '15', boxShadow: `0 0 0 2px ${bc}` }}
                    >
                      {tpl.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{tpl.name}</h4>
                      <p className="text-[10px] text-gray-500 truncate">{tpl.tagline}</p>
                    </div>
                  </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {selectedTpl && (
            <button
              onClick={() => { setStep('select'); setSelectedTpl(null) }}
              className="text-xs text-primary-600 hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              ← 重新选择模板
            </button>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">头像 (emoji)</label>
              <input type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色标语</label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">专长领域（用顿号分隔）</label>
            <input type="text" value={expertise} onChange={(e) => setExpertise(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">主题色</label>
            <div className="flex gap-2 flex-wrap">
              {ALL_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn('h-7 w-7 rounded-full border-2 transition-all cursor-pointer', color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105')}
                  style={{ backgroundColor: AGENT_COLORS[c] }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">性格参数</label>
            <div className="space-y-2">
              {[
                { label: '直接度', value: directness, set: setDirectness },
                { label: '严格度', value: strictness, set: setStrictness },
                { label: '幽默感', value: humor, set: setHumor },
                { label: '共情力', value: empathy, set: setEmpathy },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-12">{item.label}</span>
                  <input type="range" min={1} max={5} step={1} value={item.value}
                    onChange={(e) => item.set(Number(e.target.value))} className="flex-1 accent-primary-600" />
                  <span className="text-xs text-gray-400 w-6 text-right">{item.value}/5</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2">预览</p>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: borderColor + '15', boxShadow: `0 0 0 2px ${borderColor}` }}>
                {avatar || name[0] || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{name || '未命名'}</p>
                <p className="text-[10px] text-gray-500">{tagline}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 px-5 py-3 flex justify-end gap-2 shrink-0">
        <button onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer bg-white">
          取消
        </button>
        {step === 'edit' && (
          <button onClick={handleSave} disabled={!name.trim()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0">
            确认添加
          </button>
        )}
      </div>
    </>
  )

  if (embedded) {
    return <div className="flex flex-col flex-1 min-h-0">{innerContent}</div>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl bg-white shadow-xl mx-4 flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {step === 'select' ? '选择模板' : '编辑角色'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        {innerContent}
      </div>
    </div>
  )
}

// ======================== Custom Add Modal ========================

function CustomAddModal({ onClose, onSaved, embedded }: { onClose: () => void; onSaved: () => void; embedded?: boolean }) {
  const { user } = useAuthStore()
  const addAgent = useAgentStore((s) => s.addAgent)

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [avatar, setAvatar] = useState('')
  const [color, setColor] = useState<AgentColor>('indigo')
  const [category, setCategory] = useState<AgentCategory>('teacher')
  const [expertise, setExpertise] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [style, setStyle] = useState('')
  const [catchphrase, setCatchphrase] = useState('')
  const [directness, setDirectness] = useState(3)
  const [strictness, setStrictness] = useState(3)
  const [humor, setHumor] = useState(3)
  const [empathy, setEmpathy] = useState(3)

  const handleSave = () => {
    if (!name.trim()) {
      toast('error', '请输入角色名称')
      return
    }
    const agent: Agent = {
      id: createId(),
      owner_id: user?.id || '',
      name: name.trim(),
      avatar: avatar.trim() || name.trim()[0],
      tagline: tagline.trim(),
      personality: { directness, strictness, humor, empathy },
      expertise: expertise.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
      behavior: { style: style.trim(), catchphrase: catchphrase.trim() || undefined },
      system_prompt: systemPrompt.trim(),
      source: 'custom',
      is_public: false,
      usage_count: 0,
      color,
      category,
      created_at: new Date().toISOString(),
    }
    addAgent(agent)
    toast('success', `角色「${name.trim()}」已创建`)
    onSaved()
  }

  const borderColor = AGENT_COLORS[color]

  const innerContent = (
    <>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色名称 *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：李老师"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">头像 (emoji)</label>
            <input type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="例如 🎓"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">角色类别</label>
          <div className="flex gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setCategory(opt.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all cursor-pointer',
                  category === opt.value ? 'border-primary-300 bg-primary-50 text-primary-600 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
                )}>
                <span>{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">角色标语</label>
          <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="一句话描述角色"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">专长领域（用顿号分隔）</label>
          <input type="text" value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="例如：课程设计、环节编排、时间分配"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">说话风格</label>
          <input type="text" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="例如：严谨务实风"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">口头禅（可选）</label>
          <input type="text" value={catchphrase} onChange={(e) => setCatchphrase(e.target.value)} placeholder="例如：我们来看看这节课的设计思路..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">主题色</label>
          <div className="flex gap-2 flex-wrap">
            {ALL_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={cn('h-7 w-7 rounded-full border-2 transition-all cursor-pointer', color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105')}
                style={{ backgroundColor: AGENT_COLORS[c] }} />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">性格参数</label>
          <div className="space-y-2">
            {[
              { label: '直接度', value: directness, set: setDirectness },
              { label: '严格度', value: strictness, set: setStrictness },
              { label: '幽默感', value: humor, set: setHumor },
              { label: '共情力', value: empathy, set: setEmpathy },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12">{item.label}</span>
                <input type="range" min={1} max={5} step={1} value={item.value}
                  onChange={(e) => item.set(Number(e.target.value))} className="flex-1 accent-primary-600" />
                <span className="text-xs text-gray-400 w-6 text-right">{item.value}/5</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">人物设定</label>
          <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={5}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-y"
            placeholder="描述角色的身份、说话方式、专业背景和评审原则..." />
        </div>

        <div className="rounded-lg border border-gray-100 p-3 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">预览</p>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: borderColor + '15', boxShadow: `0 0 0 2px ${borderColor}` }}>
              {avatar || name[0] || '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{name || '未命名'}</p>
              <p className="text-[10px] text-gray-500">{tagline || '暂无标语'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-5 py-3 flex justify-end gap-2 shrink-0">
        <button onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer bg-white">
          取消
        </button>
        <button onClick={handleSave} disabled={!name.trim()}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0">
          创建角色
        </button>
      </div>
    </>
  )

  if (embedded) {
    return <div className="flex flex-col flex-1 min-h-0">{innerContent}</div>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl bg-white shadow-xl mx-4 flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">自定义创建角色</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        {innerContent}
      </div>
    </div>
  )
}

// ======================== Deep Create Prompts ========================

const DEEP_CREATION_PROMPT = `你是教研评审平台的角色创建助手。通过对话帮用户创建教研案评审角色。

## 回复格式（必须遵守）
- 不使用 Markdown 符号（不要用 ** - # > 等）
- 每轮回复分两段，中间用空行隔开：
  第一段：1-2 句话表示理解
  第二段：1 个追问问题
- 每轮只问一个问题，不要同时问多个
- 整体控制在 4 句话以内

## 追问要领
当用户描述某个特点时，顺着深挖下去，不要只问一轮就收：

用户说"要严格"
→ 问"严格具体指哪些方面？"                          ← 第1轮：了解具体表现
→ 答"格式不规范就重写，步骤不完整就扣分"
→ 问"对不同层次的学生，执行标准是统一的还是有弹性？"      ← 第2轮：基于新信息深入
→ 答"基础好的从严，基础弱的放宽"
→ 问"你一般怎么区分这两类学生？看成绩还是课堂表现？"      ← 第3轮：继续挖判断依据

围绕一个方向追问 2-3 轮，确认问透了，再考虑切换话题。

## 对话流程
1. 用户说想要什么 → 表示理解 + 追问一个细节
2. 用户回答后 → 基于新信息继续深挖同一方向（至少问 2-3 轮）
3. 当前方向问透后 → 问"还有什么方面需要补充吗？"
4. 用户说"差不多""就这样""可以了" → 输出 JSON

需要整理已收集信息时，用纯文本格式，不要用列表符号：
角色类型：教研老师       关注维度：课程设计
性格风格：严谨幽默       专长领域：小学数学

## 输出格式
用户确认后，输出 JSON 对象。字段名如下：
name, avatar, tagline, color, category, focusDimension(选填),
personality(directness/strictness/humor/empathy 1-5),
expertise[], behavior(style/catchphrase), system_prompt

## 重要规则
- 角色必须聚焦教研案评审，不评价课件交互和功能设计
- 角色不限于老师/学生/家长，可以自由定义
- 用户确认前不要输出 JSON`

// ======================== AI Create Modal ========================

const GUIDED_CREATION_PROMPT = `你是教研评审平台的角色创建助手。你的目标是通过**分步引导**帮教研老师创建一个教研案评审角色。

## 对话流程（严格按顺序进行，每次只问一个问题）

### 第1步：确认角色类型
首先问用户想创建什么类型的角色：
A. 👨‍🏫 教研老师视角 — 专业的教学设计审视
B. 🎒 学生视角 — 模拟学生的学习感受
C. 👨‍👩‍👧 家长视角 — 家长对教学的关注点
D. 🎭 自定义视角 — 完全自由设计

### 第2步：细化角色定位
根据用户选择的类型，进一步细化：

如果是教研老师：
- 主要关注哪个维度？课程设计 / 知识链 / 教学目标 / 课程重点 / 课程难点 / 学习梯度
- 还是综合型，不侧重特定维度？

如果是学生：
- 什么年龄段？小学 / 初中 / 高中
- 什么学习特点？活泼好动 / 安静内向 / 学霸型 / 努力追赶型

如果是家长：
- 什么教育理念？重视成绩 / 关注素质 / 比较放手 / 其他
- 对教育参与度？深度参与 / 一般关注 / 基本信任学校

### 第3步：确认性格和说话风格
问用户希望这个角色的性格偏好：
A. 严谨认真型 — 专业严格，一丝不苟
B. 温和鼓励型 — 善于发现优点，建设性建议
C. 直言不讳型 — 有问题直接指出，不留情面
D. 幽默亲和型 — 轻松表达，善用比喻
E. 让用户自由描述

### 第4步：关注重点
问用户希望这个角色在评审教研案时特别关注什么？
比如：教学目标的清晰度 / 知识点的衔接 / 课堂活动设计 / 练习题设计 / 分层教学 / 学生参与度 / 作业设计 / 其他

### 第5步：教学经验和背景
问用户想给这个角色什么样的教学背景？
比如：教龄 / 学校类型 / 是否有班主任经验 / 特殊教育经历等
（如果是学生/家长角色，跳过此步，直接到第6步）

### 第6步：生成角色
收集完信息后，告诉用户"正在为你生成角色..."，然后输出 JSON。

## JSON 输出格式（仅在第6步输出）
请严格按以下格式输出（仅输出 JSON，不要其他内容）：
\`\`\`json
{
  "name": "角色名称（2-4个字，有个性）",
  "avatar": "一个代表此角色的 emoji",
  "tagline": "一句话角色标签",
  "color": "从 indigo/violet/pink/orange/teal/sky/slate/green/rose/amber/emerald/cyan 中选一个",
  "category": "teacher 或 student 或 parent",
  "focusDimension": "课程设计/知识链/教学目标/课程重点/课程难点/学习梯度 中的一个（仅教研老师需要）",
  "personality": { "directness": 3, "strictness": 4, "humor": 2, "empathy": 3 },
  "expertise": ["专长1", "专长2", "专长3", "专长4"],
  "behavior": { "style": "说话风格描述", "catchphrase": "口头禅（有性格特色）" },
  "system_prompt": "完整的人物设定，包含角色身份、说话方式、专业背景、评审原则。要明确不评价课件交互逻辑和功能设计，专注于教研内容。"
}
\`\`\`

## 重要规则
- 每次只问一个问题，不要一次把所有问题都抛出
- 用轻松友好的语气，像和同事聊天
- 给出的选项要用 A/B/C/D 标记，方便选择
- 如果用户说"随机"或"帮我选"，你就随机组合一个
- 在最后一步之前，不要输出任何 JSON
- 角色必须聚焦教研案评审，不评价课件交互和功能设计`

const RANDOM_AGENT_PROMPT = `你是教研评审平台的角色创建助手。请随机生成一个有特色的教研案评审角色。

随机选择一种角色类型（教研老师/学生/家长），随机组合性格、说话风格、关注维度，生成一个独特的教育领域评审角色。

请严格按以下 JSON 格式输出（仅输出 JSON，不要其他内容）：
{
  "name": "角色名称（2-4个字，有个性）",
  "avatar": "一个代表此角色的 emoji",
  "tagline": "一句话角色标签",
  "color": "从 indigo/violet/pink/orange/teal/sky/slate/green/rose/amber/emerald/cyan 中随机选一个",
  "category": "teacher 或 student 或 parent",
  "focusDimension": "课程设计/知识链/教学目标/课程重点/课程难点/学习梯度 中的一个（仅 teacher 需要，其他留空字符串）",
  "personality": { "directness": 随机1-5, "strictness": 随机1-5, "humor": 随机1-5, "empathy": 随机1-5 },
  "expertise": ["专长1", "专长2", "专长3"],
  "behavior": { "style": "说话风格描述", "catchphrase": "有个性的口头禅" },
  "system_prompt": "完整的人物设定，包含教育角色身份、说话方式和评审原则。明确不评价课件交互逻辑。"
}`

// ======================== Recommend Creation Prompt ========================

export function buildRecommendCreationPrompt(title: string, content: string): string {
  return `你是教研评审平台的角色创建助手。根据用户上传的教研案文档，创建 2 个高度匹配的临时评审角色。

两个角色的定位：
- 第一个：课程专家（Curriculum Expert）— 从课程设计的专业性角度评审
- 第二个：教师（Teacher）— 从一线教学实践的角度评审

每个角色的名称请根据文档的具体内容自动生成，要求有特色、与文档主题相关。

请输出以下 JSON 格式（仅输出 JSON，不要其他内容）：
{"agents": [{
  "name": "根据文档内容生成的角色名（4-6个字）",
  "creation_reason": "一句话说明为什么要推荐此角色评审这份文档，例如「针对文档中xxx知识点的抽象概念难度和学生认知负荷进行专业评审」。必须具体到文档内容，不能是通用套话。",
  "avatar": "一个代表此角色的 emoji",
  "tagline": "一句话角色标签（体现其专业定位）",
  "color": "从 indigo/violet/pink/orange/teal/sky/slate/green/rose/amber/emerald/cyan 中选一个",
  "category": "teacher",
  "focusDimension": "课程设计/知识链/教学目标/课程重点/课程难点/学习梯度 中的一个",
  "personality": { "directness": 1-5, "strictness": 1-5, "humor": 1-5, "empathy": 1-5 },
  "expertise": ["专长1", "专长2", "专长3"],
  "behavior": { "style": "说话风格描述", "catchphrase": "口头禅（有性格特色）" },
  "system_prompt": "完整的人物设定，包含角色身份、说话方式、专业背景、评审原则。要明确不评价课件交互逻辑和功能设计，专注于教研内容。"
}, {
  "name": "根据文档内容生成的角色名（4-6个字）",
  "creation_reason": "同上，必须基于文档内容具体说明评审切入点",
  "avatar": "一个代表此角色的 emoji",
  "tagline": "一句话角色标签（体现其专业定位）",
  "color": "从 indigo/violet/pink/orange/teal/sky/slate/green/rose/amber/emerald/cyan 中选一个",
  "category": "teacher",
  "focusDimension": "课程设计/知识链/教学目标/课程重点/课程难点/学习梯度 中的一个",
  "personality": { "directness": 1-5, "strictness": 1-5, "humor": 1-5, "empathy": 1-5 },
  "expertise": ["专长1", "专长2", "专长3"],
  "behavior": { "style": "说话风格描述", "catchphrase": "口头禅（有性格特色）" },
  "system_prompt": "完整的人物设定，包含角色身份、说话方式、专业背景、评审原则。要明确不评价课件交互逻辑和功能设计，专注于教研内容。"
}]}

## 文档信息
标题：${title}

## 文档内容摘要
${content.slice(0, 3000)}

## 重要规则
- 两个角色必须有明显区别：课程专家侧重课程设计维度，教师侧重教学实践维度
- 角色名要和文档主题相关，不要用通用名
- 角色必须聚焦教研案评审，不评价课件交互和功能设计
- 每个角色的 system_prompt 要完整反映其定位和评审角度
- creation_reason 必须基于文档内容具体说明该角色的评审切入点，不能是「该角色适合评审此文」这种通用套话，要让用户一眼明白此角色针对文档的哪个方面`
}

interface AIMsg { role: 'ai' | 'user'; content: string }

function parseAgentJSON(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.name || !parsed.personality) return null
    return parsed
  } catch { return null }
}

export function parseAgentsJSON(text: string): Agent[] {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed.agents || !Array.isArray(parsed.agents)) return []
    return parsed.agents.filter((a: Record<string, unknown>) => a.name && a.personality)
  } catch { return [] }
}

function AICreateModal({ onClose, onSaved, embedded }: { onClose: () => void; onSaved: () => void; embedded?: boolean }) {
  const { user } = useAuthStore()
  const addAgent = useAgentStore((s) => s.addAgent)
  const config = useSettingsStore((s) => s.currentConfig)
  const hasValidConfig = isModelConfigValid(config)

  const [messages, setMessages] = useState<AIMsg[]>([
    { role: 'ai', content: '你好！让我们一起创建一个教研评审角色吧 🎭\n\n首先，你想创建什么类型的角色？\n\nA. 👨‍🏫 教研老师视角 — 专业的教学设计审视\nB. 🎒 学生视角 — 模拟学生的学习感受\nC. 👨‍👩‍👧 家长视角 — 家长对教学的关注点\nD. 🎭 自定义视角 — 完全自由设计\n\n输入字母选择，或直接告诉我你想要的角色！' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{
    name: string; avatar: string; tagline: string; color: AgentColor
    category?: AgentCategory; focusDimension?: string
    personality: { directness: number; strictness: number; humor: number; empathy: number }
    expertise: string[]; behavior: { style: string; catchphrase: string }; system_prompt: string
  } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const processLLMResponse = (text: string) => {
    const parsed = parseAgentJSON(text)
    if (parsed) {
      const validColor = ALL_COLORS.includes(parsed.color) ? parsed.color : ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]
      const previewData = {
        name: parsed.name, avatar: parsed.avatar || '🤖', tagline: parsed.tagline || '',
        color: validColor as AgentColor,
        category: (['teacher', 'student', 'parent'].includes(parsed.category) ? parsed.category : 'teacher') as AgentCategory,
        focusDimension: parsed.focusDimension || undefined,
        personality: {
          directness: Math.min(5, Math.max(1, parsed.personality?.directness || 3)),
          strictness: Math.min(5, Math.max(1, parsed.personality?.strictness || 3)),
          humor: Math.min(5, Math.max(1, parsed.personality?.humor || 3)),
          empathy: Math.min(5, Math.max(1, parsed.personality?.empathy || 3)),
        },
        expertise: parsed.expertise || [],
        behavior: { style: parsed.behavior?.style || '', catchphrase: parsed.behavior?.catchphrase || '' },
        system_prompt: parsed.system_prompt || '',
      }
      setPreview(previewData)
      setMessages((prev) => [...prev, {
        role: 'ai', content: `角色「${previewData.name}」已生成！\n\n请在右侧预览卡片中查看详情。如果满意，点击"保存角色"即可。\n\n不满意？继续告诉我哪里需要调整。`,
      }])
    } else {
      setMessages((prev) => [...prev, { role: 'ai', content: text || '生成失败，请重新描述。' }])
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    if (!hasValidConfig) {
      setMessages((prev) => [...prev, { role: 'ai', content: '你还没有配置 API Key，请先到「设置」页面配置模型和 API Key。\n\n配置完成后回来继续创建角色。' }])
      setLoading(false)
      return
    }

    const conversationMsgs = messages.concat([{ role: 'user', content: userMsg }]).map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))

    try {
      await chatCompletion(
        [{ role: 'system', content: GUIDED_CREATION_PROMPT }, ...conversationMsgs],
        { onChunk: () => {}, onDone: (text) => processLLMResponse(text), onError: (err) => {
          setMessages((prev) => [...prev, { role: 'ai', content: `出错了：${err.message}` }])
        }}
      )
    } catch (err) {
      const message = err instanceof LLMError ? err.message : '请求失败，请检查网络连接'
      setMessages((prev) => [...prev, { role: 'ai', content: message }])
    }
    setLoading(false)
  }

  const handleRandom = async () => {
    if (loading || !hasValidConfig) return
    setMessages((prev) => [...prev, { role: 'user', content: '🎲 随机生成一个角色！' }])
    setLoading(true)
    try {
      await chatCompletion(
        [{ role: 'system', content: RANDOM_AGENT_PROMPT }, { role: 'user', content: '请随机生成一个独特有趣的教研评审角色' }],
        { onChunk: () => {}, onDone: (text) => processLLMResponse(text), onError: (err) => {
          setMessages((prev) => [...prev, { role: 'ai', content: `出错了：${err.message}` }])
        }}
      )
    } catch (err) {
      const message = err instanceof LLMError ? err.message : '请求失败，请检查网络连接'
      setMessages((prev) => [...prev, { role: 'ai', content: message }])
    }
    setLoading(false)
  }

  const handleSave = () => {
    if (!preview) return
    const agent: Agent = {
      id: createId(), owner_id: user?.id || '',
      name: preview.name, avatar: preview.avatar, tagline: preview.tagline,
      personality: preview.personality, expertise: preview.expertise, behavior: preview.behavior,
      system_prompt: preview.system_prompt, source: 'custom', is_public: false, usage_count: 0,
      color: preview.color, category: preview.category,
      focusDimension: preview.focusDimension as Agent['focusDimension'],
      creation_history: messages.map((m) => ({ role: m.role, content: m.content })),
      created_at: new Date().toISOString(),
    }
    addAgent(agent)
    toast('success', `角色「${preview.name}」已保存！`)
    onSaved()
  }

  const categoryLabels: Record<string, string> = { teacher: '教研老师', student: '学生', parent: '家长' }

  const innerContent = (
    <div className="flex-1 flex min-h-0">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col border-r border-gray-100">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-700 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-xl bg-gray-100 px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse-dot" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="border-t border-gray-100 p-3">
          <div className="flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="输入你的选择或描述..."
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="rounded-lg bg-primary-600 px-3 py-2 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer border-0">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="w-72 shrink-0 p-4 overflow-y-auto">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">角色预览</h4>
        {preview ? (
          <div>
            <div className="rounded-xl border border-gray-100 p-3 mb-3" style={{ borderLeftWidth: '3px', borderLeftColor: AGENT_COLORS[preview.color] }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                  style={{ backgroundColor: AGENT_COLORS[preview.color] + '15', boxShadow: `0 0 0 2px ${AGENT_COLORS[preview.color]}` }}>
                  {preview.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{preview.name}</p>
                  <p className="text-[10px] text-gray-500">{preview.tagline}</p>
                </div>
              </div>
              {preview.category && (
                <div className="mb-2">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-600 border border-primary-200">
                    {categoryLabels[preview.category] || preview.category}
                  </span>
                  {preview.focusDimension && (
                    <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                      {preview.focusDimension}
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-1 mb-2">
                {Object.entries(preview.personality).map(([key, val]) => {
                  const labels: Record<string, string> = { directness: '直接度', strictness: '严格度', humor: '幽默感', empathy: '共情力' }
                  return (
                    <div key={key} className="flex items-center gap-1 text-[10px]">
                      <span className="w-10 text-gray-500">{labels[key]}</span>
                      <div className="flex-1 h-1 rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ width: `${val * 20}%`, backgroundColor: AGENT_COLORS[preview.color] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-1">
                {preview.expertise.map((e) => (
                  <span key={e} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: AGENT_COLORS[preview.color] + '15', color: AGENT_COLORS[preview.color] }}>{e}</span>
                ))}
              </div>
            </div>
            <button onClick={handleSave}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 cursor-pointer border-0">
              <Check className="h-4 w-4" /> 保存角色
            </button>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">完成对话引导后</p>
            <p className="text-xs text-gray-500">角色预览会在这里显示</p>
          </div>
        )}
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-100 shrink-0">
          <button onClick={handleRandom} disabled={loading || !hasValidConfig}
            className="flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Dices className="h-3 w-3" /> 随机生成
          </button>
          {!hasValidConfig && (
            <span className="text-xs text-amber-600">请先在设置页配置模型和 API Key</span>
          )}
        </div>
        {innerContent}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[95vw] max-w-4xl h-[85vh] rounded-xl bg-white shadow-xl mx-4 flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">AI 创建角色</h3>
            <button onClick={handleRandom} disabled={loading || !hasValidConfig}
              className="flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              <Dices className="h-3 w-3" /> 随机生成
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        {innerContent}
      </div>
    </div>
  )
}

// ======================== Deep Create Modal ========================

function DeepCreateModal({ onClose, onSaved, embedded }: { onClose: () => void; onSaved: () => void; embedded?: boolean }) {
  const { user } = useAuthStore()
  const addAgent = useAgentStore((s) => s.addAgent)
  const config = useSettingsStore((s) => s.currentConfig)
  const hasValidConfig = isModelConfigValid(config)

  const [messages, setMessages] = useState<AIMsg[]>([
    { role: 'ai', content: '你好！请自由描述你想要创建的教研评审角色 🎭\n\n比如你想创建一个什么样的角色？它有什么特点？关注什么方面？都可以告诉我。' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const [preview, setPreview] = useState<{
    name: string; avatar: string; tagline: string; color: AgentColor
    category?: AgentCategory; focusDimension?: string
    personality: { directness: number; strictness: number; humor: number; empathy: number }
    expertise: string[]; behavior: { style: string; catchphrase: string }; system_prompt: string
  } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const processLLMResponse = (text: string) => {
    const parsed = parseAgentJSON(text)
    if (parsed) {
      const validColor = ALL_COLORS.includes(parsed.color) ? parsed.color : ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]
      setPreview({
        name: parsed.name, avatar: parsed.avatar || '🤖', tagline: parsed.tagline || '',
        color: validColor as AgentColor,
        category: (['teacher', 'student', 'parent'].includes(parsed.category) ? parsed.category : 'teacher') as AgentCategory,
        focusDimension: parsed.focusDimension || undefined,
        personality: {
          directness: Math.min(5, Math.max(1, parsed.personality?.directness || 3)),
          strictness: Math.min(5, Math.max(1, parsed.personality?.strictness || 3)),
          humor: Math.min(5, Math.max(1, parsed.personality?.humor || 3)),
          empathy: Math.min(5, Math.max(1, parsed.personality?.empathy || 3)),
        },
        expertise: parsed.expertise || [],
        behavior: { style: parsed.behavior?.style || '', catchphrase: parsed.behavior?.catchphrase || '' },
        system_prompt: parsed.system_prompt || '',
      })
      setMessages((prev) => [...prev, {
        role: 'ai', content: `角色「${parsed.name}」已生成！\n\n请在右侧预览卡片中查看详情。如果满意，点击"保存角色"即可。\n\n不满意？继续告诉我哪里需要调整。`,
      }])
    } else {
      setMessages((prev) => [...prev, { role: 'ai', content: text || '生成失败，请重新描述。' }])
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    if (!hasValidConfig) {
      setMessages((prev) => [...prev, { role: 'ai', content: '你还没有配置 API Key，请先到「设置」页面配置模型和 API Key。\n\n配置完成后回来继续创建角色。' }])
      setLoading(false)
      return
    }

    const conversationMsgs = messages.concat([{ role: 'user', content: userMsg }]).map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))

    try {
      await chatCompletion(
        [{ role: 'system', content: DEEP_CREATION_PROMPT }, ...conversationMsgs],
        {
          onChunk: () => {},
          onDone: (text) => {
            processLLMResponse(text)
            setLoading(false)
          },
          onError: (err) => {
            setMessages((prev) => [...prev, { role: 'ai', content: `出错了：${err.message}` }])
            setLoading(false)
          },
        }
      )
    } catch (err) {
      const message = err instanceof LLMError ? err.message : '请求失败，请检查网络连接'
      setMessages((prev) => [...prev, { role: 'ai', content: message }])
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!preview) return
    const agent: Agent = {
      id: createId(), owner_id: user?.id || '',
      name: preview.name, avatar: preview.avatar, tagline: preview.tagline,
      personality: preview.personality, expertise: preview.expertise, behavior: preview.behavior,
      system_prompt: preview.system_prompt, source: 'custom', is_public: false, usage_count: 0,
      color: preview.color, category: preview.category,
      focusDimension: preview.focusDimension as Agent['focusDimension'],
      creation_history: messages.map((m) => ({ role: m.role, content: m.content })),
      created_at: new Date().toISOString(),
    }
    addAgent(agent)
    toast('success', `角色「${preview.name}」已保存！`)
    onSaved()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const categoryLabels: Record<string, string> = { teacher: '教研老师', student: '学生', parent: '家长' }

  const innerContent = (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col border-r border-gray-100">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-700 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                思考中...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {!preview && (
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="描述你想要的角色..."
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer border-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                发送
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Panel */}
      <div className="w-72 shrink-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {preview ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: `${AGENT_COLORS[preview.color]}15` }}>
                  {preview.avatar}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{preview.name}</h3>
                  <p className="text-xs text-gray-500">{preview.tagline}</p>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400">类别</span>
                <p className="text-sm text-gray-700">{categoryLabels[preview.category || 'teacher']}</p>
              </div>
              {preview.focusDimension && (
                <div>
                  <span className="text-xs font-medium text-gray-400">关注维度</span>
                  <p className="text-sm text-gray-700">{preview.focusDimension}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-medium text-gray-400">性格</span>
                <div className="mt-1 space-y-1">
                  {[
                    { label: '直接度', value: preview.personality.directness },
                    { label: '严谨度', value: preview.personality.strictness },
                    { label: '幽默度', value: preview.personality.humor },
                    { label: '共情度', value: preview.personality.empathy },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      <span className="w-10 text-gray-500">{item.label}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div key={star} className={`h-1.5 w-3 rounded-full ${star <= item.value ? 'bg-primary-500' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400">专长</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {preview.expertise.map((e) => (
                    <span key={e} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-600">{e}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-400">说话风格</span>
                <p className="text-sm text-gray-700">{preview.behavior.style}</p>
              </div>
              {preview.behavior.catchphrase && (
                <div>
                  <span className="text-xs font-medium text-gray-400">口头禅</span>
                  <p className="text-sm italic text-gray-600">"{preview.behavior.catchphrase}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-gray-400 text-center leading-relaxed">角色生成后<br/>在这里预览</p>
            </div>
          )}
        </div>
        {preview && (
          <div className="border-t border-gray-100 p-3">
            <button
              onClick={handleSave}
              className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors cursor-pointer border-0"
            >
              保存角色
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {embedded ? (
        innerContent
      ) : (
        <div className="flex-1 flex flex-col min-h-0">{innerContent}</div>
      )}
    </div>
  )
}

// ======================== Unified Add Modal ========================

type AddAgentTab = 'preset' | 'custom' | 'ai' | 'deep'

function UnifiedAddModal({
  initialTab = 'preset',
  initialTemplate,
  onClose,
  onSaved,
}: {
  initialTab?: AddAgentTab
  initialTemplate?: AgentTemplate
  onClose: () => void
  onSaved: () => void
}) {
  const [tab, setTab] = useState<AddAgentTab>(initialTab)

  const tabs: { key: AddAgentTab; label: string }[] = [
    { key: 'preset', label: '📋 预设模板' },
    { key: 'custom', label: '✏️ 自定义' },
    { key: 'ai', label: '🤖 AI 生成' },
    { key: 'deep', label: '🎯 深度创角' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[95vw] max-w-4xl h-[88vh] rounded-xl bg-white shadow-xl mx-4 flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with tabs + close */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer border-0',
                  tab === t.key
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 bg-transparent'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === 'preset' && (
            <PresetAddModal initialTemplate={initialTemplate} onClose={onClose} onSaved={onSaved} embedded />
          )}
          {tab === 'custom' && (
            <CustomAddModal onClose={onClose} onSaved={onSaved} embedded />
          )}
          {tab === 'ai' && (
            <AICreateModal onClose={onClose} onSaved={onSaved} embedded />
          )}
          {tab === 'deep' && (
            <DeepCreateModal onClose={onClose} onSaved={onSaved} embedded />
          )}
        </div>
      </div>
    </div>
  )
}

// ======================== Main Page ========================

export { UnifiedAddModal }
export type { AddAgentTab }

export default function AgentListPage() {
  const navigate = useNavigate()
  const templates = useAgentStore((s) => s.templates)
  const templateVisibility = useAgentStore((s) => s.templateVisibility)
  const setTemplateVisibility = useAgentStore((s) => s.setTemplateVisibility)
  const agents = useAgentStore((s) => s.agents)
  const tempAgents = useAgentStore((s) => s.tempAgents)
  const regularizeTempAgent = useAgentStore((s) => s.regularizeTempAgent)
  const removeTempAgent = useAgentStore((s) => s.removeTempAgent)
  const trashedAgents = useAgentStore((s) => s.trashedAgents)
  const removeAgent = useAgentStore((s) => s.removeAgent)
  const updateAgent = useAgentStore((s) => s.updateAgent)
  const restoreAgent = useAgentStore((s) => s.restoreAgent)
  const permanentlyDeleteAgent = useAgentStore((s) => s.permanentlyDeleteAgent)

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'manage' | 'trash'>('manage')
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null)
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Agent | null>(null)
  const [importTarget, setImportTarget] = useState<Agent | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)
  const [presetModalTpl, setPresetModalTpl] = useState<AgentTemplate | null>(null)
  const [detailModalTpl, setDetailModalTpl] = useState<AgentTemplate | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addModalTab, setAddModalTab] = useState<AddAgentTab>('preset')

  const filteredAgents = agents.filter((a) =>
    !search || a.name.includes(search) || a.expertise.some((e) => e.includes(search))
  )

  const trashCount = trashedAgents.length

  const handleDeleteAgent = (agent: Agent) => {
    removeAgent(agent.id)
    toast('success', `已将「${agent.name}」移到回收站`)
    setDeleteTarget(null)
  }

  const handleRestoreAgent = (agent: Agent) => {
    restoreAgent(agent.id)
    toast('success', `已恢复角色「${agent.name}」`)
  }

  const handlePermanentDelete = (agent: Agent) => {
    permanentlyDeleteAgent(agent.id)
    toast('success', `已永久删除「${agent.name}」`)
    setPermanentDeleteTarget(null)
  }

  const handleExport = (agent: Agent) => {
    const md = exportAgentToMD(agent)
    const filename = `${agent.name.replace(/[^\w一-鿿]/g, '_')}.md`
    downloadFile(filename, md)
    toast('success', `已导出「${agent.name}」角色文档`)
  }

  const handleImportClick = (agent: Agent) => {
    setImportTarget(agent)
  }

  const handleImportConfirm = () => {
    importFileRef.current?.click()
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !importTarget) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const md = ev.target?.result as string
      const parsed = parseAgentMD(md)
      if (!parsed || !parsed.name) {
        toast('error', '文件格式不正确，请检查 MD 文件格式')
        return
      }
      const updates: Partial<Agent> = {}
      if (parsed.name) updates.name = parsed.name
      if (parsed.avatar) updates.avatar = parsed.avatar
      if (parsed.tagline) updates.tagline = parsed.tagline
      if (parsed.color) updates.color = parsed.color
      if (parsed.category) updates.category = parsed.category
      if (parsed.focusDimension) updates.focusDimension = parsed.focusDimension
      if (parsed.expertise && parsed.expertise.length > 0) updates.expertise = parsed.expertise
      if (parsed.personality) updates.personality = parsed.personality
      if (parsed.behavior) updates.behavior = parsed.behavior
      if (parsed.system_prompt) updates.system_prompt = parsed.system_prompt
      updateAgent(importTarget!.id, updates)
      toast('success', `已导入角色配置到「${parsed.name}」`)
      setImportTarget(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleModalSaved = () => {
    setShowAddModal(false)
    setPresetModalTpl(null)
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">教研评审团</h1>
          <p className="text-sm text-gray-500 mt-1">创建和管理你的教研评审角色</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setAddModalTab('preset'); setPresetModalTpl(null); setShowAddModal(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors cursor-pointer border-0"
          >
            <Plus className="h-4 w-4" /> 新增角色
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
          {[
            { key: 'manage' as const, label: `角色管理`, icon: Bot },
            { key: 'trash' as const, label: `回收站${trashCount > 0 ? ` (${trashCount})` : ''}`, icon: Recycle },
          ].map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border-0',
                  activeTab === tab.key ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:text-gray-700 bg-transparent'
                )}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
        {activeTab !== 'trash' && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索角色..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        )}
      </div>

      {/* ====== Manage Tab ====== */}
      {activeTab === 'manage' && (
        <div className="space-y-8">
          {/* Preset Roles Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary-600" />
              <h2 className="text-base font-semibold text-gray-900">预设角色</h2>
              <span className="text-xs text-gray-400">{templates.length} 个角色</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((tpl) => {
                const borderColor = AGENT_COLORS[tpl.color]
                const isVisible = templateVisibility[tpl.id] !== false
                return (
                  <div
                    key={tpl.id}
                    className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                    style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
                    onClick={() => setDetailModalTpl(tpl)}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shrink-0"
                        style={{ backgroundColor: borderColor + '15', boxShadow: `0 0 0 2px ${borderColor}` }}
                      >
                        {tpl.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900">{tpl.name}</h3>
                          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-600 border border-primary-200">官方</span>
                        </div>
                        <p className="text-xs text-gray-500">{tpl.tagline}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {tpl.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: borderColor + '15', color: borderColor }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" checked={isVisible} onChange={() => setTemplateVisibility(tpl.id, !isVisible)}
                          className="peer sr-only" />
                        <div className={cn(
                          'h-5 w-9 rounded-full after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all',
                          isVisible ? 'bg-primary-600 after:translate-x-4' : 'bg-gray-300'
                        )}></div>
                        <span className={cn('ml-2 text-xs font-medium', isVisible ? 'text-primary-600' : 'text-gray-400')}>
                          {isVisible ? '参与评审' : '不参与评审'}
                        </span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* My Roles Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5 text-gray-600" />
              <h2 className="text-base font-semibold text-gray-900">我的角色</h2>
              <span className="text-xs text-gray-400">{agents.length} 个角色</span>
            </div>
            {filteredAgents.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
                <Bot className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">还没有角色</p>
                <p className="text-sm text-gray-400 mt-1">通过自定义或AI方式创建角色</p>
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={() => { setAddModalTab('custom'); setPresetModalTpl(null); setShowAddModal(true) }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 cursor-pointer border-0">
                    <Plus className="h-4 w-4" /> 创建角色
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAgents.map((agent) => (
                  <AgentManageCard
                    key={agent.id}
                    agent={agent}
                    onEdit={() => navigate(`/agents/${agent.id}/edit`)}
                    onDelete={() => setDeleteTarget(agent)}
                    onExport={() => handleExport(agent)}
                    onImport={() => handleImportClick(agent)}
                    onToggleVisibility={() => updateAgent(agent.id, { visibleInReview: agent.visibleInReview === false ? true : false })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Temp Roles Section */}
          {tempAgents.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-semibold text-gray-900">临时评委</h2>
                <span className="text-xs text-amber-500">{tempAgents.length} 个角色</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tempAgents.map((agent) => (
                  <div key={agent.id} className="relative rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                    {/* temp badge */}
                    <div className="absolute -top-2 -right-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      临时
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white',
                        AGENT_COLORS[agent.color]?.replace('border-', 'bg-').replace(/ \w+-\d+/, '')
                      )}>
                        {agent.avatar || agent.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{agent.name}</p>
                        <p className="truncate text-xs text-gray-500">{agent.tagline}</p>
                      </div>
                    </div>
                    {agent.reviewed_doc_title && (
                      <p className="mb-2 text-xs text-gray-400">
                        关联文档：{agent.reviewed_doc_title}
                      </p>
                    )}
                    <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-600">
                      {agent.system_prompt?.slice(0, 80)}...
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { regularizeTempAgent(agent.id); toast('success', `${agent.name} 已转为永久角色`) }}
                        className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-700 cursor-pointer border-0"
                      >
                        转正
                      </button>
                      <button
                        onClick={() => { removeTempAgent(agent.id); toast('success', `${agent.name} 已移入回收站`) }}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 cursor-pointer bg-white"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== Trash Tab ====== */}
      {activeTab === 'trash' && (
        <div className="space-y-6">
          {trashedAgents.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
              <Recycle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">回收站是空的</p>
              <p className="text-sm text-gray-400 mt-1">删除的角色会出现在这里</p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">已删除的角色 ({trashedAgents.length})</h3>
              <div className="space-y-2">
                  {trashedAgents.map((agent) => {
                    const borderColor = AGENT_COLORS[agent.color]
                    return (
                      <div key={agent.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full text-xl shrink-0 opacity-60"
                          style={{ backgroundColor: borderColor + '15' }}>
                          {agent.avatar || agent.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-700">{agent.name}</h4>
                          <p className="text-xs text-gray-500">{agent.tagline}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                            {agent.created_at && (
                              <span>创建：{new Date(agent.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                            )}
                            {agent.reviewed_doc_title && (
                              <span className="truncate max-w-[200px]" title={agent.reviewed_doc_title}>文档：{agent.reviewed_doc_title}</span>
                            )}
                          </div>
                        </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleRestoreAgent(agent)}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer bg-white">
                          <RotateCcw className="h-3 w-3" /> 恢复
                        </button>
                        <button onClick={() => setPermanentDeleteTarget(agent)}
                          className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer bg-white">
                          <Trash2 className="h-3 w-3" /> 永久删除
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== Modals ====== */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="移到回收站"
        description={deleteTarget ? `确定要将「${deleteTarget.name}」移到回收站吗？你可以在回收站中恢复。` : ''}
        confirmText="移到回收站" variant="danger"
        onConfirm={() => deleteTarget && handleDeleteAgent(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!permanentDeleteTarget}
        title="永久删除"
        description={permanentDeleteTarget ? `确定要永久删除「${permanentDeleteTarget.name}」吗？此操作不可撤销。` : ''}
        confirmText="永久删除" variant="danger"
        onConfirm={() => permanentDeleteTarget && handlePermanentDelete(permanentDeleteTarget)}
        onCancel={() => setPermanentDeleteTarget(null)}
      />
      {showAddModal && (
        <UnifiedAddModal
          initialTab={addModalTab}
          initialTemplate={presetModalTpl || undefined}
          onClose={() => { setShowAddModal(false); setPresetModalTpl(null) }}
          onSaved={handleModalSaved}
        />
      )}

      {/* Import confirm + file input */}
      <input ref={importFileRef} type="file" accept=".md,.markdown,.txt" className="hidden" onChange={handleImportFile} />
      <ConfirmDialog
        open={!!importTarget}
        title="导入角色配置"
        description={importTarget ? `导入将覆盖「${importTarget.name}」的当前配置，是否继续？` : ''}
        confirmText="选择文件并导入"
        variant="danger"
        onConfirm={handleImportConfirm}
        onCancel={() => setImportTarget(null)}
      />

      {detailModalTpl && (
        <PresetDetailModal template={detailModalTpl} onClose={() => setDetailModalTpl(null)} />
      )}
    </div>
  )
}
