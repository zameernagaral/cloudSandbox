import React from 'react'
import type { SandboxState } from '../../api/types'

const dot = 'inline-block w-1.5 h-1.5 rounded-full'

export function StatusBadge({ state }: { state: SandboxState }) {
  const classes: Record<SandboxState, string> = {
    RUNNING: 'badge-running',
    FROZEN: 'badge-frozen',
    STOPPED: 'badge-stopped',
    CREATING: 'badge-creating',
    DESTROYED: 'badge-stopped',
    ERROR: 'badge-error',
  }
  const dotColors: Record<SandboxState, string> = {
    RUNNING: 'bg-emerald-400 animate-pulse',
    FROZEN: 'bg-ink-primary',
    STOPPED: 'bg-ink-muted',
    CREATING: 'bg-ink-primary animate-pulse',
    DESTROYED: 'bg-ink-muted',
    ERROR: 'bg-ink-primary',
  }
  return (
    <span className={classes[state]}>
      <span className={`${dot} ${dotColors[state]}`} />
      {state}
    </span>
  )
}
