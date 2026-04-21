import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Activity {
  id: string
  type: 'upload' | 'review' | 'agent' | 'chat'
  text: string
  score?: number
  created_at: string
}

interface ActivityState {
  activities: Activity[]
  addActivity: (activity: Omit<Activity, 'id' | 'created_at'>) => void
  clearActivities: () => void
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      activities: [],

      addActivity: (activity) => {
        const entry: Activity = {
          ...activity,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        }
        set((state) => ({
          activities: [entry, ...state.activities].slice(0, 50),
        }))
      },

      clearActivities: () => set({ activities: [] }),
    }),
    { name: 'docmind-activity' }
  )
)
