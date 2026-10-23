import React from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Terminal, Settings as SettingsIcon, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '../../store/auth'

export function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

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
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'bg-bg text-text' : 'text-text-dim hover:text-text hover:bg-bg/50'}`}
            >
              <div className="flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Sandboxes</div>
            </Link>
            <Link 
              to="/settings" 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname === '/settings' ? 'bg-bg text-text' : 'text-text-dim hover:text-text hover:bg-bg/50'}`}
            >
              <div className="flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Settings</div>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-border">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full border border-border" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-semibold text-accent">
                {user?.email[0].toUpperCase()}
              </div>
            )}
            <div className="text-sm font-medium truncate max-w-[120px]">{user?.display_name ?? user?.email}</div>
          </div>
          <button onClick={handleLogout} className="p-2 text-text-dim hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
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
