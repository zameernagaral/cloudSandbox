import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Terminal, Github } from 'lucide-react'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import { Spinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import type { TokenResponse, User } from '../api/types'

export function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      toast.error(err.message ?? 'Login failed')
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
      <button
        onClick={handleGithub}
        id="github-login-btn"
        className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-border/50 text-text text-sm font-medium transition-all"
      >
        <Github className="w-4 h-4" />
        Continue with GitHub
      </button>
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs text-muted">
          <span className="bg-surface px-2">or continue with email</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-text-dim mb-1.5">Email</label>
          <input
            id="login-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-xs text-text-dim mb-1.5">Password</label>
          <input
            id="login-password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button
          id="login-submit-btn"
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-2.5"
        >
          {loading ? <Spinner size="sm" /> : 'Sign in'}
        </button>
      </form>
      <p className="text-center text-xs text-muted mt-5">
        Don't have an account?{' '}
        <Link to="/auth/register" className="text-accent hover:underline">
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
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const tokens = await api.post<TokenResponse>('/auth/register', {
        email,
        password,
        display_name: name || undefined,
      })
      localStorage.setItem('access_token', tokens.access_token)
      const me = await api.get<User>('/auth/me')
      setAuth(me, tokens.access_token, tokens.refresh_token)
      navigate('/onboarding')
    } catch (err: any) {
      toast.error(err.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-text-dim mb-1.5">Display name (optional)</label>
          <input id="register-name" type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-text-dim mb-1.5">Email</label>
          <input id="register-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs text-text-dim mb-1.5">Password (min 8 chars)</label>
          <input id="register-password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        <button id="register-submit-btn" type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
          {loading ? <Spinner size="sm" /> : 'Create account'}
        </button>
      </form>
      <p className="text-center text-xs text-muted mt-5">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-accent hover:underline">Sign in</Link>
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
    if (!code) { setError('Missing code parameter'); return }
    api.get<TokenResponse>(`/auth/github/callback?code=${code}`)
      .then(async (tokens) => {
        localStorage.setItem('access_token', tokens.access_token)
        const me = await api.get<User>('/auth/me')
        setAuth(me, tokens.access_token, tokens.refresh_token)
        navigate('/dashboard')
      })
      .catch((e) => setError(e.message))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <AuthLayout title="Auth error"><p className="text-danger text-sm">{error}</p></AuthLayout>
  return <AuthLayout title="Signing in..."><Spinner /></AuthLayout>
}

function AuthLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-accent" />
          </div>
          <span className="font-semibold">Cloud Sandbox</span>
        </div>
        <div className="card p-8">
          <h1 className="text-lg font-semibold mb-6">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
