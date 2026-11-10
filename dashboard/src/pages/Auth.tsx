import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Terminal, Github, Sparkles } from 'lucide-react'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import type { TokenResponse, User } from '../api/types'

export function Login() {
  const navigate = useNavigate()
  const { setAuth, loginAsDemo } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDemoLogin = () => {
    loginAsDemo()
    toast.success('Logged in as Demo Engineer')
    navigate('/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const tokens = await api.post<TokenResponse>('/auth/login', { email, password })
      localStorage.setItem('access_token', tokens.access_token)
      const me = await api.get<User>('/auth/me')
      setAuth(me, tokens.access_token, tokens.refresh_token)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.message ?? 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleGithub = () => {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GITHUB_CLIENT_ID ?? '',
      redirect_uri: `${window.location.origin}/auth/github/callback`,
      scope: 'user:email',
    })
    window.location.href = `https://github.com/login/oauth/authorize?${params}`
  }

  return (
    <AuthLayout title="Sign in to Cloud Sandbox">
      {/* 1-Click Demo Login for presentations */}
      <button
        onClick={handleDemoLogin}
        type="button"
        id="demo-login-btn"
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-signal-hazard text-bg-base font-mono text-sm font-semibold hover:bg-[#D97706] transition-colors mb-4"
      >
        <Sparkles className="w-4 h-4 text-bg-base" aria-hidden="true" />
        Instant Demo Login (For Presentations)
      </button>

      <button
        onClick={handleGithub}
        id="github-login-btn"
        type="button"
        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-rule-frame bg-surface-bulkhead hover:bg-surface-elevated text-ink-primary text-sm font-medium transition-colors"
      >
        <Github className="w-4 h-4" aria-hidden="true" />
        <span>Continue with GitHub</span>
      </button>

      <div className="relative my-5" role="separator" aria-label="Authentication Options">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-rule-frame" />
        </div>
        <div className="relative flex justify-center text-xs font-mono text-ink-muted">
          <span className="bg-surface-bulkhead px-2">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="auth-title">
        <div>
          <label htmlFor="login-email" className="block text-xs font-mono text-ink-muted mb-1.5">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            className="w-full bg-surface-elevated border border-rule-frame px-3 py-2 text-sm text-ink-primary font-mono focus:outline-none focus:border-signal-hazard"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="name@company.com"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-xs font-mono text-ink-muted mb-1.5">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="w-full bg-surface-elevated border border-rule-frame px-3 py-2 text-sm text-ink-primary font-mono focus:outline-none focus:border-signal-hazard"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>
        <button
          id="login-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-signal-hazard text-bg-base font-mono font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#D97706] transition-colors disabled:opacity-50"
        >
          {loading ? <Spinner size="sm" /> : 'Sign in'}
        </button>
      </form>
      <p className="text-center text-xs text-ink-muted mt-5">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-signal-hazard hover:underline font-mono">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}

export function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const tokens = await api.post<TokenResponse>('/auth/register', {
        email,
        password,
        display_name: displayName || undefined,
      })
      localStorage.setItem('access_token', tokens.access_token)
      const me = await api.get<User>('/auth/me')
      setAuth(me, tokens.access_token, tokens.refresh_token)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.message ?? 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create host account">
      <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="auth-title">
        <div>
          <label htmlFor="register-name" className="block text-xs font-mono text-ink-muted mb-1.5">
            Display name
          </label>
          <input
            id="register-name"
            type="text"
            className="w-full bg-surface-elevated border border-rule-frame px-3 py-2 text-sm text-ink-primary font-mono focus:outline-none focus:border-signal-hazard"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label htmlFor="register-email" className="block text-xs font-mono text-ink-muted mb-1.5">
            Email address
          </label>
          <input
            id="register-email"
            type="email"
            className="w-full bg-surface-elevated border border-rule-frame px-3 py-2 text-sm text-ink-primary font-mono focus:outline-none focus:border-signal-hazard"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="name@company.com"
          />
        </div>
        <div>
          <label htmlFor="register-password" className="block text-xs font-mono text-ink-muted mb-1.5">
            Password (min 8 chars)
          </label>
          <input
            id="register-password"
            type="password"
            className="w-full bg-surface-elevated border border-rule-frame px-3 py-2 text-sm text-ink-primary font-mono focus:outline-none focus:border-signal-hazard"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
          />
        </div>
        <button
          id="register-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-signal-hazard text-bg-base font-mono font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#D97706] transition-colors disabled:opacity-50"
        >
          {loading ? <Spinner size="sm" /> : 'Create account'}
        </button>
      </form>
      <p className="text-center text-xs text-ink-muted mt-5">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-signal-hazard hover:underline font-mono">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export function GitHubCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    const code = params.get('code')
    if (!code) {
      setError('Missing code parameter')
      return
    }
    api
      .get<TokenResponse>(`/auth/github/callback?code=${code}`)
      .then(async (tokens) => {
        localStorage.setItem('access_token', tokens.access_token)
        const me = await api.get<User>('/auth/me')
        setAuth(me, tokens.access_token, tokens.refresh_token)
        navigate('/dashboard')
      })
      .catch((e) => setError(e.message))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error)
    return (
      <AuthLayout title="Auth error">
        <p className="text-signal-breach text-sm font-mono">{error}</p>
      </AuthLayout>
    )
  return (
    <AuthLayout title="Signing in...">
      <Spinner />
    </AuthLayout>
  )
}

function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main-content" role="main" className="min-h-screen bg-bg-base text-ink-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <header className="flex flex-col items-center gap-2 justify-center text-center">
          <Link to="/" className="inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-signal-hazard rounded-sm p-1">
            <div className="w-8 h-8 rounded-sm bg-signal-hazard/15 border border-signal-hazard/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-signal-hazard" aria-hidden="true" />
            </div>
            <span className="font-display font-bold text-base text-ink-primary">Cloud Sandbox</span>
          </Link>
          <p className="text-xs font-mono text-ink-muted">Access your isolated Firecracker host cluster.</p>
        </header>
        <section aria-labelledby="auth-title" className="card p-6 sm:p-8 bg-surface-bulkhead border border-rule-frame rounded-md shadow-bulkhead">
          <h1 id="auth-title" className="font-display text-lg font-semibold mb-6 text-ink-primary">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  )
}
