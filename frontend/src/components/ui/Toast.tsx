import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

let addToastFn: ((toast: Omit<ToastItem, 'id'>) => void) | null = null

export function toast(type: ToastItem['type'], message: string) {
  addToastFn?.({ type, message })
}

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info }
const STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const add = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000)
  }, [])

  useEffect(() => {
    addToastFn = add
    return () => { addToastFn = null }
  }, [add])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 w-80">
      {toasts.map((t) => {
        const Icon = ICONS[t.type]
        return (
          <div key={t.id} className={cn('flex items-start gap-2 rounded-lg border px-4 py-3 shadow-lg animate-slide-up', STYLES[t.type])}>
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="flex-1 text-sm">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 bg-transparent border-0 cursor-pointer opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
