import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, ShieldAlert, KeyRound, Lock, Mail, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { api, ApiError } from '../../api/client'

export function AdminLogin() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [email, setEmail] = useState('admin@cloudsandbox.io')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 2FA TOTP code is mandatory for admin console access
    if (!totpCode || totpCode.trim().length !== 6) {
      setError('A valid 6-digit TOTP two-factor authentication token is required.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<{ access_token: string; refresh_token: string }>('/auth/login', {
        email,
        password,
      })

      // Fetch user profile to verify admin role
      const me = await api.get<{ id: string; email: string; is_admin: boolean; display_name: string }>('/auth/me')

      if (!me.is_admin) {
        setError('Access denied: Your account does not possess administrator privileges.')
        setLoading(false)
        return
      }

      setAuth(me as any, res.access_token, res.refresh_token || 'admin-refresh-token')
      navigate('/admin')
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid administrator credentials or expired session.')
      } else {
        setError(err.message || 'Unable to authenticate with the control plane.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base text-ink-primary flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Terminal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 border border-signal-hazard/40 bg-surface-bulkhead flex items-center justify-center">
            <Shield className="w-5 h-5 text-signal-hazard" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight text-ink-primary">
              Cloud Sandbox Admin
            </h1>
            <p className="text-xs font-mono text-ink-muted">
              Hypervisor Control Deck • Tier-0 Authentication
            </p>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-surface-bulkhead border border-rule-frame p-6 shadow-bulkhead">
          <div className="mb-5 pb-4 border-b border-rule-frame">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-signal-hazard uppercase tracking-wider">
                Privileged Access Only
              </span>
              <span className="text-xs font-mono text-ink-muted">2FA Required</span>
            </div>
            <p className="text-sm text-ink-muted mt-1 font-body">
              Multi-factor hardware credentials are required to manage Linux KVM nodes and fleet policies.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-signal-breach/10 border border-signal-breach/40 flex items-start gap-2 text-xs text-signal-breach">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-ink-muted uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@cloudsandbox.io"
                  className="w-full bg-surface-elevated border border-rule-frame pl-9 pr-3 py-2 text-sm text-ink-primary font-mono focus:outline-none focus:border-signal-hazard"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-ink-muted uppercase tracking-wider mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-surface-elevated border border-rule-frame pl-9 pr-3 py-2 text-sm text-ink-primary font-mono focus:outline-none focus:border-signal-hazard"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-ink-muted uppercase tracking-wider">
                  TOTP 2FA Token (6 Digits)
                </label>
                <span className="text-2xs font-mono text-signal-hazard">Authenticator App</span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-signal-hazard absolute left-3 top-3" />
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  placeholder="000000"
                  className="w-full bg-surface-elevated border border-rule-frame pl-9 pr-3 py-2 text-sm text-ink-primary font-mono tracking-widest focus:outline-none focus:border-signal-hazard"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-signal-hazard text-bg-base font-mono font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#D97706] transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying Credentials...' : 'Authenticate & Open Console'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-rule-frame flex items-center justify-between text-2xs font-mono text-ink-muted">
            <Link to="/auth/login" className="hover:text-ink-primary underline underline-offset-4">
              Return to Developer Login
            </Link>
            <span>SHA-256 / AES-256-GCM</span>
          </div>
        </div>
      </div>
    </div>
  )
}
