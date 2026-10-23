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
    RUNNING: 'bg-success animate-pulse',
    FROZEN: 'bg-frozen animate-pulse',
    STOPPED: 'bg-muted',
    CREATING: 'bg-warning animate-pulse',
    DESTROYED: 'bg-muted',
    ERROR: 'bg-danger animate-pulse',
  }
  return (
    <span className={classes[state]}>
      <span className={`${dot} ${dotColors[state]}`} />
      {state}
    </span>
  )
}
