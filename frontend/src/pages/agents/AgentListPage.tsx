import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Bot, Sparkles, Trash2, Edit3, X, RotateCcw, Recycle, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgentStore, AGENT_COLORS, createAgentFromTemplate } from '@/stores/agentStore'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { AgentTemplate, Agent } from '@/types'

const TEMPLATE_GROUPS: { label: string; icon: string; ids: string[] }[] = [
  { label: '技术研发', icon: '💻', ids: ['tpl-2', 'tpl-8'] },
  { label: '产品设计', icon: '🎨', ids: ['tpl-3', 'tpl-4', 'tpl-5'] },
  { label: '管理决策', icon: '👔', ids: ['tpl-6', 'tpl-1'] },
  { label: '专业服务', icon: '⚖️', ids: ['tpl-7'] },
]

function CompactTemplateCard({ template, onUse, onHide, onClick }: {
  template: AgentTemplate; onUse: () => void; onHide: () => void; onClick: () => void
}) {
  const borderColor = AGENT_COLORS[template.color]
  return (
    <div
      className="w-52 shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer relative group"
      style={{ borderTopWidth: '3px', borderTopColor: borderColor }}
      onClick={onClick}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onHide() }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 bg-transparent border-0 cursor-pointer transition-all p-1 rounded-md hover:bg-red-50"
        title="隐藏此模板"
      >
        <EyeOff className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-xl shrink-0"
          style={{ backgroundColor: borderColor + '15', boxShadow: `0 0 0 2px ${borderColor}` }}
        >
          {template.avatar}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{template.name}</h3>
          <p className="text-xs text-gray-500 truncate">{template.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        {template.tags.map((tag) => (
          <span key={tag} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: borderColor + '15', color: borderColor }}>
            {tag}
          </span>
        ))}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onUse() }}
        className="w-full rounded-lg bg-primary-600 py-1.5 text-xs font-medium text-white hover:bg-primary-700 transition-colors cursor-pointer border-0"
      >
        添加此角色
      </button>
    </div>
  )
}

function TemplateDetailModal({ template, onClose, onUse }: {
  template: AgentTemplate; onClose: () => void; onUse: () => void
}) {
  const borderColor = AGENT_COLORS[template.color]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-slide-up mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900">角色详情</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-3xl"
            style={{ backgroundColor: borderColor + '15', boxShadow: `0 0 0 2px ${borderColor}` }}
          >
            {template.avatar}
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-900">{template.name}</h4>
            <p className="text-sm text-gray-500">{template.tagline}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{template.description}</p>

        <div className="space-y-2 mb-4">
          {[
            { label: '直接度', value: template.personality.directness },
            { label: '严格度', value: template.personality.strictness },
            { label: '幽默感', value: template.personality.humor },
            { label: '共情力', value: template.personality.empathy },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span className="w-12 text-gray-500">{item.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${item.value * 20}%`, backgroundColor: borderColor }} />
              </div>
              <span className="text-gray-400 w-5 text-right">{item.value}/5</span>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">专长领域</p>
          <div className="flex flex-wrap gap-1.5">
            {template.expertise.map((e) => (
              <span key={e} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: borderColor + '15', color: borderColor }}>
                {e}
              </span>
            ))}
          </div>
        </div>

        {template.behavior.catchphrase && (
          <p className="text-xs text-gray-400 italic mb-5">口头禅："{template.behavior.catchphrase}"</p>
        )}

        <button
          onClick={() => { onUse(); onClose() }}
          className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors cursor-pointer border-0"
        >
          添加此角色
        </button>
      </div>
    </div>
  )
}

function MyAgentCard({ agent, onDelete }: { agent: Agent; onDelete: () => void }) {
  const borderColor = AGENT_COLORS[agent.color]
  return (
    <div
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
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
        {agent.expertise.map((e) => (
          <span key={e} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: borderColor + '15', color: borderColor }}>
            {e}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {agent.source === 'template' ? '来自模板' : '自定义创建'} · 已使用 {agent.usage_count} 次
      </p>
      <div className="flex gap-2 border-t border-gray-100 pt-3">
        <Link
          to={`/agents/${agent.id}/edit`}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors no-underline"
        >
          <Edit3 className="h-3.5 w-3.5" /> 编辑
        </Link>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer bg-white"
        >
          <Trash2 className="h-3.5 w-3.5" /> 删除
        </button>
      </div>
    </div>
  )
}

export default function AgentListPage() {
  const { user } = useAuthStore()
  const templates = useAgentStore((s) => s.templates)
  const hiddenTemplateIds = useAgentStore((s) => s.hiddenTemplateIds)
  const agents = useAgentStore((s) => s.agents)
  const trashedAgents = useAgentStore((s) => s.trashedAgents)
  const addAgent = useAgentStore((s) => s.addAgent)
  const removeAgent = useAgentStore((s) => s.removeAgent)
  const hideTemplate = useAgentStore((s) => s.hideTemplate)
  const restoreTemplate = useAgentStore((s) => s.restoreTemplate)
  const restoreAgent = useAgentStore((s) => s.restoreAgent)
  const permanentlyDeleteAgent = useAgentStore((s) => s.permanentlyDeleteAgent)

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'templates' | 'my' | 'trash'>('templates')
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null)
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Agent | null>(null)
  const [detailTemplate, setDetailTemplate] = useState<AgentTemplate | null>(null)

  const visibleTemplates = templates.filter((t) => !hiddenTemplateIds.includes(t.id))
  const filteredTemplates = visibleTemplates.filter((t) =>
    !search || t.name.includes(search) || t.tags.some((tag) => tag.includes(search))
  )
  const groupedTemplates = useMemo(() => {
    const filteredIds = new Set(filteredTemplates.map((t) => t.id))
    const tplMap = new Map(filteredTemplates.map((t) => [t.id, t]))
    const grouped: { label: string; icon: string; templates: AgentTemplate[] }[] = []
    const usedIds = new Set<string>()

    for (const group of TEMPLATE_GROUPS) {
      const items = group.ids.filter((id) => filteredIds.has(id)).map((id) => tplMap.get(id)!)
      if (items.length > 0) {
        grouped.push({ label: group.label, icon: group.icon, templates: items })
        items.forEach((t) => usedIds.add(t.id))
      }
    }
    const ungrouped = filteredTemplates.filter((t) => !usedIds.has(t.id))
    if (ungrouped.length > 0) {
      grouped.push({ label: '其他', icon: '🤖', templates: ungrouped })
    }
    return grouped
  }, [filteredTemplates])
  const filteredAgents = agents.filter((a) =>
    !search || a.name.includes(search) || a.expertise.some((e) => e.includes(search))
  )
  const hiddenTemplates = templates.filter((t) => hiddenTemplateIds.includes(t.id))

  const handleUseTemplate = (tpl: AgentTemplate) => {
    const exists = agents.some((a) => a.template_id === tpl.id)
    if (exists) {
      toast('info', `你已经添加过「${tpl.name}」了`)
      return
    }
    const agent = createAgentFromTemplate(tpl, user?.id || '')
    addAgent(agent)
    toast('success', `已添加角色「${tpl.name}」到你的 Agent 列表`)
  }

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

  const handleHideTemplate = (tpl: AgentTemplate) => {
    hideTemplate(tpl.id)
    toast('info', `已隐藏「${tpl.name}」，可在回收站恢复`)
  }

  const handleRestoreTemplate = (id: string) => {
    restoreTemplate(id)
    toast('success', '已恢复模板')
  }

  const trashCount = trashedAgents.length + hiddenTemplates.length

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent 工坊</h1>
          <p className="text-sm text-gray-500 mt-1">创建和管理你的 AI 评审角色</p>
        </div>
        <Link
          to="/agents/create"
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors no-underline"
        >
          <Plus className="h-4 w-4" />
          创建 Agent
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
          {[
            { key: 'templates' as const, label: '预设模板', icon: Sparkles },
            { key: 'my' as const, label: `我的 Agent (${agents.length})`, icon: Bot },
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
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索角色..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        )}
      </div>

      {activeTab === 'templates' && (
        <div>
          {filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                {search ? '没有匹配的模板' : '所有模板已隐藏，可以在回收站恢复'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedTemplates.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{group.icon}</span>
                    <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
                    <span className="text-xs text-gray-400">{group.templates.length} 个角色</span>
                  </div>
                  <div className="overflow-x-auto pb-2 -mx-1 px-1">
                    <div className="flex gap-4">
                      {group.templates.map((template) => (
                        <CompactTemplateCard
                          key={template.id}
                          template={template}
                          onUse={() => handleUseTemplate(template)}
                          onHide={() => handleHideTemplate(template)}
                          onClick={() => setDetailTemplate(template)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'my' && (
        filteredAgents.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <Bot className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">还没有自定义 Agent</p>
            <p className="text-sm text-gray-400 mt-1">从预设模板添加或对话式创建你的第一个评审角色</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => setActiveTab('templates')}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer bg-white"
              >
                浏览模板
              </button>
              <Link
                to="/agents/create"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 no-underline"
              >
                <Plus className="h-4 w-4" /> 创建 Agent
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAgents.map((agent) => (
              <MyAgentCard key={agent.id} agent={agent} onDelete={() => setDeleteTarget(agent)} />
            ))}
          </div>
        )
      )}

      {activeTab === 'trash' && (
        <div className="space-y-6">
          {trashedAgents.length === 0 && hiddenTemplates.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
              <Recycle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">回收站是空的</p>
              <p className="text-sm text-gray-400 mt-1">删除的 Agent 和隐藏的模板会出现在这里</p>
            </div>
          ) : (
            <>
              {trashedAgents.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">已删除的 Agent ({trashedAgents.length})</h3>
                  <div className="space-y-2">
                    {trashedAgents.map((agent) => {
                      const borderColor = AGENT_COLORS[agent.color]
                      return (
                        <div key={agent.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-xl shrink-0 opacity-60"
                            style={{ backgroundColor: borderColor + '15' }}
                          >
                            {agent.avatar || agent.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-700">{agent.name}</h4>
                            <p className="text-xs text-gray-500">{agent.tagline}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleRestoreAgent(agent)}
                              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer bg-white transition-colors"
                            >
                              <RotateCcw className="h-3 w-3" /> 恢复
                            </button>
                            <button
                              onClick={() => setPermanentDeleteTarget(agent)}
                              className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer bg-white transition-colors"
                            >
                              <Trash2 className="h-3 w-3" /> 永久删除
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {hiddenTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">已隐藏的模板 ({hiddenTemplates.length})</h3>
                  <div className="space-y-2">
                    {hiddenTemplates.map((tpl) => {
                      const borderColor = AGENT_COLORS[tpl.color]
                      return (
                        <div key={tpl.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-xl shrink-0 opacity-60"
                            style={{ backgroundColor: borderColor + '15' }}
                          >
                            {tpl.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-700">{tpl.name}</h4>
                            <p className="text-xs text-gray-500">{tpl.tagline}</p>
                          </div>
                          <button
                            onClick={() => handleRestoreTemplate(tpl.id)}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer bg-white transition-colors shrink-0"
                          >
                            <RotateCcw className="h-3 w-3" /> 恢复
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="移到回收站"
        description={deleteTarget ? `确定要将「${deleteTarget.name}」移到回收站吗？你可以在回收站中恢复。` : ''}
        confirmText="移到回收站"
        variant="danger"
        onConfirm={() => deleteTarget && handleDeleteAgent(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!permanentDeleteTarget}
        title="永久删除"
        description={permanentDeleteTarget ? `确定要永久删除「${permanentDeleteTarget.name}」吗？此操作不可撤销。` : ''}
        confirmText="永久删除"
        variant="danger"
        onConfirm={() => permanentDeleteTarget && handlePermanentDelete(permanentDeleteTarget)}
        onCancel={() => setPermanentDeleteTarget(null)}
      />

      {detailTemplate && (
        <TemplateDetailModal
          template={detailTemplate}
          onClose={() => setDetailTemplate(null)}
          onUse={() => handleUseTemplate(detailTemplate)}
        />
      )}
    </div>
  )
}
