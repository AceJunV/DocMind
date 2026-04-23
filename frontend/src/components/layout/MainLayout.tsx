import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-primary-50 dark:bg-[#0f1117]">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-6 animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
