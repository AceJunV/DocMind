# 前端开发模式库

## React 组件模式

### 基础组件
```typescript
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function Button({ children, onClick, variant = 'primary', disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded ${variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'}`}
    >
      {children}
    </button>
  )
}
```

### 表单处理
```typescript
export function ProjectForm() {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })

      if (!res.ok) throw new Error('Failed')
      // 处理成功
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

## 状态管理模式

### useState
```typescript
const [data, setData] = useState<Project[]>([])
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### useEffect
```typescript
useEffect(() => {
  async function fetchData() {
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setData(data.projects)
    } catch (err) {
      setError(err.message)
    }
  }
  fetchData()
}, [])
```

## Tailwind CSS 模式

### 响应式布局
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 内容 */}
</div>
```

### 常用样式组合
```tsx
// 卡片
<div className="bg-white rounded-lg shadow-md p-6">

// 按钮
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">

// 输入框
<input className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
```

## Next.js 页面模式

```typescript
// app/projects/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function ProjectsPage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/projects')
        const data = await res.json()
        setProjects(data.projects)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Projects</h1>
      {/* 内容 */}
    </div>
  )
}
```
