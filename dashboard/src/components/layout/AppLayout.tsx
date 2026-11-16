import React, { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Terminal,
  Settings as SettingsIcon,
  LogOut,
  LayoutDashboard,
  Zap,
  Shield,
  Home,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [backendOnline, setBackendOnline] = useState<boolean>(true)

  useEffect(() => {
    let active = true
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/v1/health')
        if (active) setBackendOnline(res.ok)
      } catch {
        if (active) setBackendOnline(false)
      }
    }
    checkHealth()
    const timer = setInterval(checkHealth, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-bg-base text-ink-primary flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-rule-frame bg-surface-bulkhead sticky top-0 z-30">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 overflow-x-auto">
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-sm bg-surface-elevated border border-rule-frame flex items-center justify-center">
                <Terminal className="w-4 h-4 text-ink-primary" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-ink-primary">
                Cloud Sandbox
              </span>
            </Link>

            <div className="flex items-center gap-1.5">
              <Link
                to="/"
                className="px-3 py-2 rounded-sm text-sm font-medium text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors whitespace-nowrap"
              >
                <span className="flex items-center gap-1.5">
                  <Home className="w-4 h-4" /> Home
                </span>
              </Link>

              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-sm text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/dashboard' || pathname.startsWith('/sandbox/')
                    ? 'bg-bg-base text-ink-primary border border-rule-frame'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-elevated'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" /> Fleet Console
                </span>
              </Link>

              <a
                href="/#demo"
                className="px-3 py-2 rounded-sm text-sm font-medium text-amber-300 hover:bg-surface-elevated transition-colors whitespace-nowrap"
              >
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Simulator
                </span>
              </a>

              <Link
                to="/settings"
                className={`px-3 py-2 rounded-sm text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === '/settings'
                    ? 'bg-bg-base text-ink-primary border border-rule-frame'
                    : 'text-ink-muted hover:text-ink-primary hover:bg-surface-elevated'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <SettingsIcon className="w-4 h-4" /> Settings &amp; CLI
                </span>
              </Link>

              {user?.is_admin && (
                <Link
                  to="/admin"
                  className="hidden md:inline-flex px-3 py-2 rounded-sm text-sm font-medium text-ink-muted hover:text-ink-primary hover:bg-surface-elevated transition-colors whitespace-nowrap"
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Admin
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-mono border ${
                backendOnline
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-500/35 text-amber-300'
              }`}
              title={backendOnline ? 'Connected to live Control Plane on port 8000' : 'Control Plane offline (using local fallback)'}
            >
              <span
                className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
              />
              {backendOnline ? 'Live Control Plane (:8000)' : 'Offline Fallback'}
            </span>

            <div className="hidden md:flex items-center gap-2.5 pr-3 border-r border-rule-frame">
              <div className="w-8 h-8 rounded-full bg-surface-elevated border border-rule-frame flex items-center justify-center text-xs font-semibold text-ink-primary">
                {user?.email ? user.email[0].toUpperCase() : 'U'}
              </div>
              <div className="text-sm font-medium truncate max-w-[150px]">
                {user?.display_name ?? user?.email ?? 'Operator'}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-2 text-ink-muted hover:text-red-300 hover:bg-red-500/10 rounded-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
