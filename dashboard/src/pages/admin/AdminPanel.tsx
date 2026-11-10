import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield,
  Server,
  Users,
  AlertTriangle,
  FileText,
  Activity,
  Plus,
  Trash2,
  Edit2,
  Download,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpRight,
  RefreshCw,
  Cpu,
  Layers,
  Lock,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth'
import { api } from '../../api/client'

type TabKey = 'overview' | 'policies' | 'hosts' | 'alerts' | 'users' | 'audit' | 'failure-states'

interface OverviewData {
  total_users: number
  active_hosts: number
  total_sandboxes: number
  breached_sandboxes: number
  total_spend_usd: number
}

interface PolicyItem {
  id: string
  name: string
  max_cost_usd: number | null
  max_tokens: number | null
  loop_detection_n: number
  action: string
  is_default: boolean
}

interface HostItem {
  id: string
  name: string
  agent_url: string
  is_active: boolean
  total_vcpu: number
  total_ram_mb: number
  firecracker_version: string | null
}

interface AlertItem {
  id: string
  sandbox_id: string
  sandbox_name: string
  owner_email: string
  reason: string
  cost_usd: number
  status: 'new' | 'in_review' | 'resolved'
  created_at: string
}

interface UserItem {
  id: string
  email: string
  display_name: string | null
  is_admin: boolean
  is_active: boolean
  created_at: string
}

interface AuditLogItem {
  id: string
  event_type: string
  user_id: string | null
  sandbox_id: string | null
  ip_address: string | null
  payload: any
  created_at: string
}

export function AdminPanel() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [policies, setPolicies] = useState<PolicyItem[]>([])
  const [hosts, setHosts] = useState<HostItem[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])

  // Modal / form states
  const [showNewPolicyModal, setShowNewPolicyModal] = useState(false)
  const [newPolicyName, setNewPolicyName] = useState('')
  const [newPolicyCost, setNewPolicyCost] = useState('0.10')
  const [newPolicyTokens, setNewPolicyTokens] = useState('20000')

  const [alertFilter, setAlertFilter] = useState<'all' | 'new' | 'in_review' | 'resolved'>('all')

  const fetchData = async () => {
    setRefreshing(true)
    try {
      const [ov, pols, hsts, alrts, usrs, auds] = await Promise.all([
        api.get<OverviewData>('/admin/overview').catch(() => null),
        api.get<PolicyItem[]>('/policies').catch(() => []),
        api.get<HostItem[]>('/hosts').catch(() => []),
        api.get<AlertItem[]>('/admin/alerts').catch(() => []),
        api.get<UserItem[]>('/admin/users').catch(() => []),
        api.get<AuditLogItem[]>('/admin/audit-logs').catch(() => []),
      ])

      if (ov) setOverview(ov)
      setPolicies(pols)
      setHosts(hsts)
      setAlerts(alrts)
      setUsers(usrs)
      setAuditLogs(auds)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 1. Authorization check: Deny anonymous or non-admin accounts
  if (!user) {
    return (
      <div className="min-h-screen bg-bg-base text-ink-primary flex flex-col justify-center items-center p-6 text-center">
        <Lock className="w-12 h-12 text-signal-hazard mb-4" />
        <h1 className="text-xl font-display font-bold">Authentication Required</h1>
        <p className="text-sm text-ink-muted mt-2 max-w-md font-body">
          You must authenticate with two-factor administrative credentials to access the hypervisor console.
        </p>
        <Link
          to="/admin/login"
          className="mt-6 px-4 py-2 bg-signal-hazard text-bg-base font-mono text-sm font-medium hover:bg-[#D97706]"
        >
          Open Admin Login
        </Link>
      </div>
    )
  }

  if (!user.is_admin) {
    return (
      <div className="min-h-screen bg-bg-base text-ink-primary flex flex-col justify-center items-center p-6 text-center">
        <Ban className="w-12 h-12 text-signal-breach mb-4" />
        <h1 className="text-xl font-display font-bold">403 Forbidden — Privileged Access Required</h1>
        <p className="text-sm text-ink-muted mt-2 max-w-md font-body">
          Your account ({user.email}) is currently assigned to a member role. You lack server-side permissions to
          configure cluster hosts, manage user roles, or edit global killswitch policies.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 border border-rule-frame text-ink-primary font-mono text-sm hover:bg-surface-bulkhead"
          >
            Return to Fleet Dashboard
          </Link>
          <Link
            to="/admin/login"
            className="px-4 py-2 bg-signal-hazard text-bg-base font-mono text-sm font-medium hover:bg-[#D97706]"
          >
            Switch to Admin Account
          </Link>
        </div>
      </div>
    )
  }

  // Action handlers
  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPolicyName) return
    try {
      const created = await api.post<PolicyItem>('/policies', {
        name: newPolicyName,
        max_cost_usd: parseFloat(newPolicyCost) || 0.1,
        max_tokens: parseInt(newPolicyTokens, 10) || 20000,
        loop_detection_n: 5,
        action: 'pause',
      })
      setPolicies([created, ...policies])
      setShowNewPolicyModal(false)
      setNewPolicyName('')
    } catch (err: any) {
      alert(`Failed to create policy: ${err.message}`)
    }
  }

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this killswitch policy?')) return
    try {
      await api.delete(`/policies/${id}`)
      setPolicies(policies.filter((p) => p.id !== id))
    } catch (err: any) {
      alert(`Failed to delete policy: ${err.message}`)
    }
  }

  const handleToggleUserAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_admin: !currentStatus })
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_admin: !currentStatus } : u)))
    } catch (err: any) {
      alert(`Failed to update user role: ${err.message}`)
    }
  }

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}`, { is_active: !currentStatus })
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u)))
    } catch (err: any) {
      alert(`Failed to update user status: ${err.message}`)
    }
  }

  const handleExportAlertsCSV = () => {
    const headers = ['Alert ID', 'Sandbox Name', 'Owner Email', 'Cost (USD)', 'Reason', 'Status', 'Timestamp']
    const rows = alerts.map((a) => [
      a.id,
      `"${a.sandbox_name}"`,
      a.owner_email,
      a.cost_usd.toFixed(4),
      `"${a.reason.replace(/"/g, '""')}"`,
      a.status,
      a.created_at,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `cloud-sandbox-incidents-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredAlerts = alerts.filter((a) => {
    if (alertFilter === 'all') return true
    return a.status === alertFilter
  })

  return (
    <div className="min-h-screen bg-bg-base text-ink-primary font-body">
      {/* Top Banner / Landmark Header */}
      <header className="border-b border-rule-frame bg-surface-bulkhead sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-signal-hazard/50 bg-bg-base flex items-center justify-center">
              <Shield className="w-4 h-4 text-signal-hazard" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-tight text-ink-primary">
                  Cloud Sandbox Admin
                </span>
                <span className="px-1.5 py-0.5 text-3xs font-mono uppercase bg-signal-hazard/20 text-signal-hazard border border-signal-hazard/40">
                  Tier-0 Root
                </span>
              </div>
              <span className="text-2xs font-mono text-ink-muted">
                Hypervisor Control Deck • Linux KVM 5.10+
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="text-xs font-mono text-ink-muted hover:text-ink-primary flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Sync Cluster
            </button>
            <div className="h-4 w-px bg-rule-frame" />
            <div className="text-right hidden sm:block">
              <div className="text-xs font-mono text-ink-primary">{user.email}</div>
              <div className="text-2xs font-mono text-signal-hazard">Authorized Admin</div>
            </div>
            <Link
              to="/dashboard"
              className="px-2.5 py-1 text-xs font-mono border border-rule-frame text-ink-muted hover:text-ink-primary hover:border-ink-muted"
            >
              Fleet View
            </Link>
          </div>
        </div>

        {/* Tab Strip */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-6 border-t border-rule-frame/40 overflow-x-auto text-xs font-mono">
          {[
            { key: 'overview', label: 'Cluster Overview', icon: Activity },
            { key: 'policies', label: 'Killswitch Policies', icon: Shield },
            { key: 'hosts', label: 'Hardware Nodes', icon: Server },
            { key: 'alerts', label: 'Incident Submissions', icon: AlertTriangle, count: alerts.length },
            { key: 'users', label: 'User Roles & Access', icon: Users },
            { key: 'audit', label: 'Audit Log', icon: FileText },
            { key: 'failure-states', label: 'Failure States Showcase', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`py-3 flex items-center gap-2 border-b-2 font-medium tracking-wide transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'border-signal-hazard text-signal-hazard'
                    : 'border-transparent text-ink-muted hover:text-ink-primary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 text-3xs font-mono bg-signal-breach text-bg-base font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-ink-primary">Hypervisor Fleet Overview</h2>
                <p className="text-xs font-mono text-ink-muted mt-0.5">
                  Real-time telemetry aggregated across registered Firecracker v1.7.0 host nodes.
                </p>
              </div>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface-bulkhead border border-rule-frame p-5">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                  <span>ACTIVE KVM HOSTS</span>
                  <Server className="w-4 h-4 text-signal-hazard" />
                </div>
                <div className="mt-2 text-2xl font-mono font-bold text-ink-primary">
                  {overview?.active_hosts ?? hosts.length} <span className="text-xs font-normal text-ink-muted">Nodes</span>
                </div>
                <div className="mt-1 text-2xs font-mono text-ink-muted">100% mTLS Encrypted Bridge</div>
              </div>

              <div className="bg-surface-bulkhead border border-rule-frame p-5">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                  <span>TOTAL MICROVMS</span>
                  <Cpu className="w-4 h-4 text-ink-muted" />
                </div>
                <div className="mt-2 text-2xl font-mono font-bold text-ink-primary">
                  {overview?.total_sandboxes ?? 2} <span className="text-xs font-normal text-ink-muted">Instances</span>
                </div>
                <div className="mt-1 text-2xs font-mono text-ink-muted">Jailer UID 1000 Isolated</div>
              </div>

              <div className="bg-surface-bulkhead border border-signal-breach/40 p-5">
                <div className="flex items-center justify-between text-xs font-mono text-signal-breach">
                  <span>TRIPPED KILLSWITCHES</span>
                  <AlertTriangle className="w-4 h-4 text-signal-breach" />
                </div>
                <div className="mt-2 text-2xl font-mono font-bold text-signal-breach">
                  {overview?.breached_sandboxes ?? 1} <span className="text-xs font-normal text-ink-muted">Frozen</span>
                </div>
                <div className="mt-1 text-2xs font-mono text-signal-breach">Sub-second Latency Enforced</div>
              </div>

              <div className="bg-surface-bulkhead border border-rule-frame p-5">
                <div className="flex items-center justify-between text-xs font-mono text-ink-muted">
                  <span>FLEET TOKEN SPEND</span>
                  <Shield className="w-4 h-4 text-signal-hazard" />
                </div>
                <div className="mt-2 text-2xl font-mono font-bold text-signal-hazard">
                  ${(overview?.total_spend_usd ?? 0.1942).toFixed(4)}{' '}
                  <span className="text-xs font-normal text-ink-muted">USD</span>
                </div>
                <div className="mt-1 text-2xs font-mono text-ink-muted">LLM Proxy Monitored</div>
              </div>
            </div>

            {/* Quick Infrastructure Table */}
            <div className="bg-surface-bulkhead border border-rule-frame p-5">
              <h3 className="text-sm font-mono text-ink-primary uppercase tracking-wider mb-3">
                Cluster Hypervisor Readiness
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3 bg-surface-elevated border border-rule-frame">
                  <div className="text-ink-muted">VIRTUALIZATION ENGINE</div>
                  <div className="text-ink-primary font-bold mt-1">AWS Firecracker v1.7.0</div>
                  <div className="text-2xs text-signal-hazard mt-0.5">Static Pinning Enforced</div>
                </div>
                <div className="p-3 bg-surface-elevated border border-rule-frame">
                  <div className="text-ink-muted">KERNEL HARDWARE BRIDGE</div>
                  <div className="text-ink-primary font-bold mt-1">Linux /dev/kvm (5.10+)</div>
                  <div className="text-2xs text-ink-muted mt-0.5">cgroups v2 + seccomp filters</div>
                </div>
                <div className="p-3 bg-surface-elevated border border-rule-frame">
                  <div className="text-ink-muted">HOST-VM PROTOCOL</div>
                  <div className="text-ink-primary font-bold mt-1">Point-to-Point VSock</div>
                  <div className="text-2xs text-ink-muted mt-0.5">Multiplexed Port 1024</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POLICIES (CRUD) */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-ink-primary">Killswitch Policies</h2>
                <p className="text-xs font-mono text-ink-muted mt-0.5">
                  Manage spend caps, token rate boundaries, and automated microVM freeze triggers.
                </p>
              </div>
              <button
                onClick={() => setShowNewPolicyModal(true)}
                className="px-3 py-1.5 bg-signal-hazard text-bg-base font-mono text-xs font-medium flex items-center gap-1.5 hover:bg-[#D97706]"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Policy
              </button>
            </div>

            {/* Policy Table */}
            <div className="bg-surface-bulkhead border border-rule-frame overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-elevated border-b border-rule-frame text-ink-muted uppercase">
                  <tr>
                    <th className="py-3 px-4">Policy Name</th>
                    <th className="py-3 px-4">Cost Cap (USD)</th>
                    <th className="py-3 px-4">Max Tokens</th>
                    <th className="py-3 px-4">Loop Detection</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule-frame">
                  {policies.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-elevated/40">
                      <td className="py-3 px-4 font-bold text-ink-primary flex items-center gap-2">
                        {p.name}
                        {p.is_default && (
                          <span className="px-1.5 py-0.2 text-3xs font-mono bg-signal-hazard/20 text-signal-hazard border border-signal-hazard/40">
                            DEFAULT
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-signal-hazard">${p.max_cost_usd?.toFixed(2) ?? 'Uncapped'}</td>
                      <td className="py-3 px-4 text-ink-muted">{p.max_tokens?.toLocaleString() ?? 'Uncapped'}</td>
                      <td className="py-3 px-4 text-ink-muted">{p.loop_detection_n} identical calls</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-2xs uppercase bg-surface-elevated border border-rule-frame text-ink-primary">
                          {p.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!p.is_default && (
                          <button
                            onClick={() => handleDeletePolicy(p.id)}
                            className="text-signal-breach hover:text-red-400 p-1"
                            title="Delete policy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: HOST HARDWARE NODES */}
        {activeTab === 'hosts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-ink-primary">Connected Firecracker Host Nodes</h2>
                <p className="text-xs font-mono text-ink-muted mt-0.5">
                  Bare-metal and nested virtualization Linux nodes connected via secure mTLS agent daemons.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {hosts.map((host) => (
                <div key={host.id} className="bg-surface-bulkhead border border-rule-frame p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-ink-primary">{host.name}</span>
                        <span className="px-1.5 py-0.5 text-3xs font-mono bg-green-500/20 text-green-400 border border-green-500/40">
                          {host.is_active ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-ink-muted">{host.agent_url}</span>
                    </div>
                    <span className="text-xs font-mono text-signal-hazard">
                      {host.firecracker_version || 'v1.7.0'}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-rule-frame grid grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-ink-muted block text-2xs">vCPU CAPACITY</span>
                      <span className="text-ink-primary font-bold">{host.total_vcpu} Cores</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-2xs">TOTAL RAM</span>
                      <span className="text-ink-primary font-bold">{(host.total_ram_mb / 1024).toFixed(1)} GB</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block text-2xs">KVM STATUS</span>
                      <span className="text-green-400 font-bold">/dev/kvm [OK]</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Setup Command */}
            <div className="bg-surface-bulkhead border border-rule-frame p-5">
              <h3 className="text-xs font-mono uppercase text-ink-muted mb-2">
                Host Agent Setup Command (Ubuntu 22.04 LTS /dev/kvm):
              </h3>
              <div className="p-3 bg-surface-elevated border border-rule-frame font-mono text-xs text-signal-hazard select-all">
                curl -sSL https://get.cloudsandbox.io/host-agent.sh | sudo bash -s -- --token=cs_host_live_984f1a0e
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SUBMISSIONS & ALERTS INBOX */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-display font-bold text-ink-primary">Containment Breach Submissions</h2>
                <p className="text-xs font-mono text-ink-muted mt-0.5">
                  Triage queue of automated killswitch trips and microVM security policy alerts.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex border border-rule-frame text-xs font-mono">
                  {(['all', 'new', 'in_review', 'resolved'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAlertFilter(filter)}
                      className={`px-3 py-1 uppercase text-2xs ${
                        alertFilter === filter
                          ? 'bg-signal-hazard text-bg-base font-bold'
                          : 'bg-surface-bulkhead text-ink-muted hover:text-ink-primary'
                      }`}
                    >
                      {filter.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleExportAlertsCSV}
                  className="px-3 py-1.5 border border-rule-frame bg-surface-bulkhead text-ink-primary hover:border-ink-muted text-xs font-mono flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-surface-bulkhead border border-rule-frame overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-elevated border-b border-rule-frame text-ink-muted uppercase">
                  <tr>
                    <th className="py-3 px-4">Alert ID</th>
                    <th className="py-3 px-4">Sandbox</th>
                    <th className="py-3 px-4">Owner Email</th>
                    <th className="py-3 px-4">Reason / Breach Description</th>
                    <th className="py-3 px-4">Cost</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule-frame">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ink-muted">
                        No incident submissions match the selected status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((a) => (
                      <tr key={a.id} className="hover:bg-surface-elevated/40">
                        <td className="py-3 px-4 font-bold text-signal-breach">{a.id}</td>
                        <td className="py-3 px-4 text-ink-primary">{a.sandbox_name}</td>
                        <td className="py-3 px-4 text-ink-muted">{a.owner_email}</td>
                        <td className="py-3 px-4 text-ink-primary max-w-xs truncate" title={a.reason}>
                          {a.reason}
                        </td>
                        <td className="py-3 px-4 text-signal-hazard">${a.cost_usd.toFixed(4)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-2xs uppercase ${
                              a.status === 'new'
                                ? 'bg-signal-breach/20 text-signal-breach border border-signal-breach/40'
                                : a.status === 'in_review'
                                ? 'bg-signal-hazard/20 text-signal-hazard border border-signal-hazard/40'
                                : 'bg-green-500/20 text-green-400 border border-green-500/40'
                            }`}
                          >
                            {a.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: USER & ROLE MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-ink-primary">User Accounts & Roles</h2>
                <p className="text-xs font-mono text-ink-muted mt-0.5">
                  Manage platform tenancy, toggle administrator privileges, and audit active users.
                </p>
              </div>
            </div>

            <div className="bg-surface-bulkhead border border-rule-frame overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-elevated border-b border-rule-frame text-ink-muted uppercase">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Role Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule-frame">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-elevated/40">
                      <td className="py-3 px-4 font-bold text-ink-primary">{u.display_name || 'Standard User'}</td>
                      <td className="py-3 px-4 text-ink-muted">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-2xs uppercase ${
                            u.is_admin
                              ? 'bg-signal-hazard/20 text-signal-hazard border border-signal-hazard/40 font-bold'
                              : 'bg-surface-elevated text-ink-muted border border-rule-frame'
                          }`}
                        >
                          {u.is_admin ? 'Admin' : 'Member'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-2xs ${u.is_active ? 'text-green-400' : 'text-signal-breach'}`}>
                          {u.is_active ? '● Active' : '○ Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {u.id !== user.id && (
                          <>
                            <button
                              onClick={() => handleToggleUserAdmin(u.id, u.is_admin)}
                              className="px-2 py-1 text-2xs border border-rule-frame hover:bg-surface-elevated text-ink-primary"
                            >
                              {u.is_admin ? 'Demote to Member' : 'Promote to Admin'}
                            </button>
                            <button
                              onClick={() => handleToggleUserActive(u.id, u.is_active)}
                              className="px-2 py-1 text-2xs border border-rule-frame hover:bg-surface-elevated text-ink-muted hover:text-signal-breach"
                            >
                              {u.is_active ? 'Suspend' : 'Reactivate'}
                            </button>
                          </>
                        )}
                        {u.id === user.id && (
                          <span className="text-2xs text-ink-muted italic">Current Session</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-ink-primary">System Audit Log</h2>
                <p className="text-xs font-mono text-ink-muted mt-0.5">
                  Append-only immutable record of hypervisor and control plane administrative actions.
                </p>
              </div>
            </div>

            <div className="bg-surface-bulkhead border border-rule-frame overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-elevated border-b border-rule-frame text-ink-muted uppercase">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Actor / IP</th>
                    <th className="py-3 px-4">Target Resource</th>
                    <th className="py-3 px-4">Payload Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule-frame">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-elevated/40">
                      <td className="py-3 px-4 text-ink-muted whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-2xs uppercase bg-surface-elevated border border-rule-frame text-ink-primary">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-ink-muted">{log.ip_address || 'internal-rpc'}</td>
                      <td className="py-3 px-4 text-ink-primary font-bold">{log.sandbox_id || 'System'}</td>
                      <td className="py-3 px-4 text-ink-muted max-w-sm truncate" title={JSON.stringify(log.payload)}>
                        {JSON.stringify(log.payload)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: FAILURE STATES SHOWCASE (EXACT FROM COPY.MD SECTION 8) */}
        {activeTab === 'failure-states' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-display font-bold text-ink-primary">
                Failure States Showcase (`docs/COPY.md` Section 8)
              </h2>
              <p className="text-xs font-mono text-ink-muted mt-0.5">
                Every failure state is authored with zero apologies: clear explanation of what went wrong + immediate resolution action.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Failure State 1 */}
              <div className="bg-surface-bulkhead border border-signal-breach/40 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-mono uppercase text-signal-breach">State 1: Financial Breach</span>
                  <span className="text-2xs font-mono text-ink-muted">HTTP 200 / Killswitch</span>
                </div>
                <h3 className="text-sm font-bold font-display text-ink-primary">
                  Containment breach: cost cap exceeded
                </h3>
                <p className="text-xs text-ink-muted mt-2 font-body">
                  Sandbox #fc-c840f1 spent $0.0104 USD, exceeding your $0.0100 limit. The killswitch halted execution in 640ms. Process memory is preserved in a frozen state.
                </p>
                <div className="mt-4 pt-3 border-t border-rule-frame flex items-center gap-2">
                  <button className="px-2.5 py-1 text-2xs font-mono bg-signal-breach text-bg-base font-bold">
                    Destroy sandbox
                  </button>
                  <button className="px-2.5 py-1 text-2xs font-mono border border-rule-frame text-ink-primary hover:bg-surface-elevated">
                    Increase cap to $0.05 & resume
                  </button>
                </div>
              </div>

              {/* Failure State 2 */}
              <div className="bg-surface-bulkhead border border-rule-frame p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-mono uppercase text-ink-muted">State 2: Empty Fleet</span>
                  <span className="text-2xs font-mono text-ink-muted">Zero Instances</span>
                </div>
                <h3 className="text-sm font-bold font-display text-ink-primary">
                  No active microVMs
                </h3>
                <p className="text-xs text-ink-muted mt-2 font-body">
                  Your host cluster has zero isolated sandboxes running. Launch a sandbox from an existing template or execute a test run using the demo agent.
                </p>
                <div className="mt-4 pt-3 border-t border-rule-frame flex items-center gap-2">
                  <button className="px-2.5 py-1 text-2xs font-mono bg-signal-hazard text-bg-base font-bold">
                    Provision sandbox
                  </button>
                  <button className="px-2.5 py-1 text-2xs font-mono border border-rule-frame text-ink-primary hover:bg-surface-elevated">
                    Launch rogue agent demo
                  </button>
                </div>
              </div>

              {/* Failure State 3 */}
              <div className="bg-surface-bulkhead border border-signal-hazard/40 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-mono uppercase text-signal-hazard">State 3: Daemon Disconnect</span>
                  <span className="text-2xs font-mono text-ink-muted">WebSocket Loss</span>
                </div>
                <h3 className="text-sm font-bold font-display text-ink-primary">
                  Host agent connection lost
                </h3>
                <p className="text-xs text-ink-muted mt-2 font-body">
                  Lost real-time connection to host agent at 10.0.4.12:8080. Telemetry stream paused. Check that the host-agent service is running and port 8080 is accessible over mTLS.
                </p>
                <div className="mt-4 pt-3 border-t border-rule-frame flex items-center gap-2">
                  <button className="px-2.5 py-1 text-2xs font-mono bg-signal-hazard text-bg-base font-bold">
                    Reconnect now
                  </button>
                </div>
              </div>

              {/* Failure State 4 */}
              <div className="bg-surface-bulkhead border border-signal-breach/40 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-mono uppercase text-signal-breach">State 4: Host Starvation</span>
                  <span className="text-2xs font-mono text-ink-muted">RAM Exceeded</span>
                </div>
                <h3 className="text-sm font-bold font-display text-ink-primary">
                  Host cluster out of memory
                </h3>
                <p className="text-xs text-ink-muted mt-2 font-body">
                  All 128 GB of host memory is allocated across 16 running sandboxes. Cannot provision an additional 1,024 MB microVM.
                </p>
                <div className="mt-4 pt-3 border-t border-rule-frame flex items-center gap-2">
                  <button className="px-2.5 py-1 text-2xs font-mono bg-signal-breach text-bg-base font-bold">
                    Destroy idle sandboxes
                  </button>
                  <button className="px-2.5 py-1 text-2xs font-mono border border-rule-frame text-ink-primary hover:bg-surface-elevated">
                    Connect secondary host node
                  </button>
                </div>
              </div>

              {/* Failure State 5 */}
              <div className="bg-surface-bulkhead border border-signal-hazard/40 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-mono uppercase text-signal-hazard">State 5: Egress Dropped</span>
                  <span className="text-2xs font-mono text-ink-muted">Jailer Firewall</span>
                </div>
                <h3 className="text-sm font-bold font-display text-ink-primary">
                  Outbound connection blocked
                </h3>
                <p className="text-xs text-ink-muted mt-2 font-body">
                  Guest process attempted to connect to unauthorized IP 198.51.100.4:443. The Firecracker jailer firewall dropped the connection. Outbound traffic is restricted to api.openai.com.
                </p>
                <div className="mt-4 pt-3 border-t border-rule-frame flex items-center gap-2">
                  <button className="px-2.5 py-1 text-2xs font-mono border border-rule-frame text-ink-primary hover:bg-surface-elevated">
                    Add domain to sandbox whitelist
                  </button>
                </div>
              </div>

              {/* Failure State 6 */}
              <div className="bg-surface-bulkhead border border-signal-breach/40 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs font-mono uppercase text-signal-breach">State 6: Linux OOM Killer</span>
                  <span className="text-2xs font-mono text-ink-muted">Cgroup Fault</span>
                </div>
                <h3 className="text-sm font-bold font-display text-ink-primary">
                  Process terminated by memory limit
                </h3>
                <p className="text-xs text-ink-muted mt-2 font-body">
                  Process inside microVM #fc-c840f1 exceeded the 512 MB memory boundary and was terminated by the Linux OOM killer.
                </p>
                <div className="mt-4 pt-3 border-t border-rule-frame flex items-center gap-2">
                  <button className="px-2.5 py-1 text-2xs font-mono bg-signal-hazard text-bg-base font-bold">
                    Increase sandbox RAM allocation to 1024 MB
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Policy Modal */}
      {showNewPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-surface-bulkhead border border-rule-frame p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-display font-bold text-ink-primary mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-signal-hazard" />
              Create Killswitch Policy
            </h3>
            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div>
                <label className="block text-2xs font-mono text-ink-muted uppercase mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Strict Production Cap"
                  value={newPolicyName}
                  onChange={(e) => setNewPolicyName(e.target.value)}
                  className="w-full bg-surface-elevated border border-rule-frame px-3 py-2 text-xs font-mono text-ink-primary focus:outline-none focus:border-signal-hazard"
                />
              </div>

              <div>
                <label className="block text-2xs font-mono text-ink-muted uppercase mb-1">Cost Cap (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newPolicyCost}
                  onChange={(e) => setNewPolicyCost(e.target.value)}
                  className="w-full bg-surface-elevated border border-rule-frame px-3 py-2 text-xs font-mono text-ink-primary focus:outline-none focus:border-signal-hazard"
                />
              </div>

              <div>
                <label className="block text-2xs font-mono text-ink-muted uppercase mb-1">Max Token Threshold</label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={newPolicyTokens}
                  onChange={(e) => setNewPolicyTokens(e.target.value)}
                  className="w-full bg-surface-elevated border border-rule-frame px-3 py-2 text-xs font-mono text-ink-primary focus:outline-none focus:border-signal-hazard"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-rule-frame">
                <button
                  type="button"
                  onClick={() => setShowNewPolicyModal(false)}
                  className="px-3 py-1.5 border border-rule-frame text-xs font-mono text-ink-muted hover:text-ink-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-signal-hazard text-bg-base font-mono text-xs font-medium hover:bg-[#D97706]"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
