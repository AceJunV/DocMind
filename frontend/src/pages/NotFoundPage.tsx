import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-primary-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">页面不存在</h1>
        <p className="text-gray-500 mb-8">你访问的页面可能已被移除或输入了错误的地址。</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> 返回上页
          </button>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 no-underline transition-colors"
          >
            <Home className="h-4 w-4" /> 回到首页
          </Link>
        </div>
      </div>
    </div>
  )
}
