import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, Server, ChevronRight } from 'lucide-react'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { HostRegisterResponse } from '../api/types'
import toast from 'react-hot-toast'

export function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    try {
      const res = await api.post<HostRegisterResponse>('/hosts', {
        name: 'Default Host',
        agent_url: 'wss://localhost:8765', // example default
        total_vcpu: 8,
        total_ram_mb: 16384,
        total_disk_gb: 100
      })
      setToken(res.token)
      setStep(2)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate token')
    }
  }

  const copyCmd = `curl -sSL https://raw.githubusercontent.com/your-org/cloud-sandbox/main/host-agent/install.sh | bash -s -- \\
  --control-plane-url ${window.location.origin} \\
  --token ${token}`

  const handleCopy = () => {
    navigator.clipboard.writeText(copyCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl card p-8">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.display_name ?? 'Developer'}!</h1>
        <p className="text-text-dim mb-8">Let's connect your first Firecracker host machine.</p>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-surface border border-border flex gap-4">
              <Server className="w-6 h-6 text-accent shrink-0" />
              <div>
                <h3 className="font-semibold text-sm mb-1">What you need</h3>
                <ul className="text-sm text-text-dim space-y-1 list-disc list-inside">
                  <li>A Linux machine (bare metal or nested-virt enabled)</li>
                  <li>/dev/kvm available</li>
                  <li>Root access to install the agent and Firecracker</li>
                </ul>
              </div>
            </div>
            <button onClick={handleGenerate} className="btn-primary w-full justify-center">
              Generate installation command
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full justify-center">
              Skip for now
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Run this on your host machine:</label>
              <div className="relative group">
                <pre className="p-4 rounded-lg bg-bg border border-border font-mono text-xs text-text-dim overflow-x-auto">
                  {copyCmd}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-1.5 rounded bg-surface border border-border hover:bg-border text-text transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
              Keep this token secret. It authenticates your host agent with the control plane.
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn-primary w-full justify-center">
              Go to Dashboard <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
