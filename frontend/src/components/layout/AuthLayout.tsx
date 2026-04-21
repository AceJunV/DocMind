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
            多角色 AI
            <br />
            教研案评审平台
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            上传教研案，教研老师、学生、家长多视角评审，六维度精准分析。
            进入教研研讨室深度讨论，发现教学设计的改进空间。
          </p>
          <div className="mt-10 flex gap-4">
            {['📐 周老师', '🎒 小明', '📈 刘妈妈', '🧩 张老师'].map((name) => (
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
