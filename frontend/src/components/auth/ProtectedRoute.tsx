import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      login(
        {
          id: crypto.randomUUID(),
          email: 'user@docmind.local',
          name: '体验用户',
          created_at: new Date().toISOString(),
        },
        'auto-token'
      )
    }
  }, [isAuthenticated, login])

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
