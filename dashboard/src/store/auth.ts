import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../api/types'
import { mockUser } from '../api/mockData'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  demoMode: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  setDemoMode: (val: boolean) => void
  loginAsDemo: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      demoMode: false,
      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken)
        set({ user, accessToken, refreshToken, demoMode: false })
      },
      clearAuth: () => {
        localStorage.removeItem('access_token')
        set({ user: null, accessToken: null, refreshToken: null, demoMode: false })
      },
      setDemoMode: (val: boolean) => {
        set({ demoMode: val })
      },
      loginAsDemo: () => {
        localStorage.setItem('access_token', 'demo-token-cloud-sandbox')
        set({
          user: mockUser,
          accessToken: 'demo-token-cloud-sandbox',
          refreshToken: 'demo-refresh-token',
          demoMode: true,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
        demoMode: s.demoMode,
      }),
    },
  ),
)
