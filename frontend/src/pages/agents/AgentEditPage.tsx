import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAgentStore, AGENT_COLORS } from '@/stores/agentStore'
import { toast } from '@/components/ui/Toast'
import type { AgentColor } from '@/types'

const COLOR_OPTIONS: AgentColor[] = ['indigo', 'violet', 'pink', 'orange', 'teal', 'sky', 'slate', 'green']

export default function AgentEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const agent = useAgentStore((s) => s.agents.find((a) => a.id === id))
  const updateAgent = useAgentStore((s) => s.updateAgent)

  const [name, setName] = useState(agent?.name || '')
  const [tagline, setTagline] = useState(agent?.tagline || '')
  const [avatar, setAvatar] = useState(agent?.avatar || '')
  const [color, setColor] = useState<AgentColor>(agent?.color || 'indigo')
  const [expertise, setExpertise] = useState(agent?.expertise.join('、') || '')
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || '')
  const [directness, setDirectness] = useState(agent?.personality.directness || 3)
  const [strictness, setStrictness] = useState(agent?.personality.strictness || 3)
  const [humor, setHumor] = useState(agent?.personality.humor || 3)
  const [empathy, setEmpathy] = useState(agent?.personality.empathy || 3)

  if (!agent) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Link to="/agents" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-underline">
          <ArrowLeft className="h-4 w-4" /> 返回 Agent 工坊
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Bot className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Agent 不存在或已被删除</p>
          <Link to="/agents" className="mt-4 inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 no-underline">
            返回 Agent 工坊
          </Link>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast('error', '请输入角色名称')
      return
    }
    updateAgent(agent.id, {
      name: name.trim(),
      tagline: tagline.trim(),
      avatar: avatar.trim() || name.trim()[0],
      color,
      expertise: expertise.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
      system_prompt: systemPrompt.trim(),
      personality: { directness, strictness, humor, empathy },
    })
    toast('success', `角色「${name.trim()}」已更新`)
    navigate('/agents')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <Link to="/agents" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 no-underline">
        <ArrowLeft className="h-4 w-4" /> 返回 Agent 工坊
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">编辑 Agent</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">角色名称</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="角色名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">头像 (emoji)</label>
                <input
                  type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="例如 🎓"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">角色标语</label>
              <input
                type="text" value={tagline} onChange={(e) => setTagline(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="一句话描述角色"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">专长领域（用顿号分隔）</label>
              <input
                type="text" value={expertise} onChange={(e) => setExpertise(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="例如：学术写作、逻辑论证、文献引用"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">主题色</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-all cursor-pointer',
                      color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: AGENT_COLORS[c] }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">系统提示词</label>
              <textarea
                value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-y"
                placeholder="角色的系统提示词..."
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">性格参数</h3>
            {[
              { label: '直接度', value: directness, set: setDirectness },
              { label: '严格度', value: strictness, set: setStrictness },
              { label: '幽默感', value: humor, set: setHumor },
              { label: '共情力', value: empathy, set: setEmpathy },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900">{item.value}/5</span>
                </div>
                <input
                  type="range" min={1} max={5} step={1}
                  value={item.value}
                  onChange={(e) => item.set(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">预览</h3>
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: AGENT_COLORS[color] + '15', boxShadow: `0 0 0 2px ${AGENT_COLORS[color]}` }}
              >
                {avatar || name[0] || '?'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{name || '未命名'}</p>
                <p className="text-xs text-gray-500">{tagline || '暂无标语'}</p>
              </div>
            </div>
            {expertise && (
              <div className="flex flex-wrap gap-1.5">
                {expertise.split(/[、,，]/).filter(Boolean).map((e) => (
                  <span key={e} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: AGENT_COLORS[color] + '15', color: AGENT_COLORS[color] }}>
                    {e.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors cursor-pointer border-0"
          >
            <Save className="h-4 w-4" /> 保存修改
          </button>
        </div>
      </div>
    </div>
  )
}
