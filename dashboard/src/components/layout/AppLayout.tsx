import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Terminal, Settings as SettingsIcon, LogOut, LayoutDashboard, Zap, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth, demoMode, setDemoMode } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Top Navigation */}
      <nav className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10 relative">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-accent" />
            </div>
            <span className="font-semibold tracking-tight">Cloud Sandbox</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/dashboard' ? 'bg-bg text-text' : 'text-text-dim hover:text-text hover:bg-bg/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Sandboxes
              </div>
            </Link>

            <Link
              to="/demo"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/demo'
                  ? 'bg-frozen/15 text-frozen border border-frozen/30'
                  : 'text-frozen/80 hover:text-frozen hover:bg-frozen/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-frozen" /> Live Killswitch Demo
              </div>
            </Link>

            <Link
              to="/settings"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/settings' ? 'bg-bg text-text' : 'text-text-dim hover:text-text hover:bg-bg/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" /> Settings
              </div>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Demo Mode Toggle Badge */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              demoMode
                ? 'bg-accent/15 border-accent/40 text-accent hover:bg-accent/25'
                : 'bg-surface border-border text-text-dim hover:text-text'
            }`}
            title="Click to toggle between Presentation Demo Mode and Live API"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {demoMode ? 'Demo Mode Active' : 'Live API Mode'}
          </button>

          <div className="flex items-center gap-3 pr-4 border-r border-border">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full border border-border" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-semibold text-accent">
                {user?.email ? user.email[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="text-sm font-medium truncate max-w-[140px]">
              {user?.display_name ?? user?.email ?? 'Demo User'}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 text-text-dim hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
