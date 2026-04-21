import { Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-primary-50">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-primary-600 to-primary-700 p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="h-10 w-10" />
            <span className="text-3xl font-bold">DocMind</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            多角色 AI Agent
            <br />
            文档评审平台
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            上传文档，创建不同身份的 AI Agent 组成评审团队，获得多视角评价与优化建议。
            进入聊天室与 Agent 深度辩论，通过角色碰撞发现盲区。
          </p>
          <div className="mt-10 flex gap-4">
            {['🎓 李教授', '💻 老张', '📋 陈产品', '🎨 小林'].map((name) => (
              <div
                key={name}
                className="rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-sm font-medium"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center text-primary-600">
            <Sparkles className="h-8 w-8" />
            <span className="text-2xl font-bold">DocMind</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
