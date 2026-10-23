import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { Landing } from './pages/Landing'
import { Login, Register, GitHubCallback } from './pages/Auth'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { SandboxDetail } from './pages/SandboxDetail'
import { Settings } from './pages/Settings'
import { AppLayout } from './components/layout/AppLayout'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RedirectIfAuth><Landing /></RedirectIfAuth>} />
        
        {/* Auth routes */}
        <Route path="/auth/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
        <Route path="/auth/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
        <Route path="/auth/github/callback" element={<GitHubCallback />} />
        
        {/* Onboarding */}
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

        {/* Protected Dashboard Routes */}
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sandbox/:id" element={<SandboxDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
