import React from 'react'
import clsx from 'clsx'

interface MeterBarProps {
  label: string
  value: number
  max: number
  unit?: string
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'frozen'
}

export function MeterBar({ label, value, max, unit = '' }: MeterBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const atLimit = pct >= 90
  const fillColor = atLimit ? 'bg-ink-primary' : 'bg-emerald-500'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-ink-muted">
        <span>{label}</span>
        <span className={atLimit ? 'text-ink-primary font-semibold font-mono' : 'font-mono text-ink-primary'}>
          {typeof value === 'number' ? value.toFixed(4) : value}
          {unit} / {max}
          {unit}
        </span>
      </div>
      <div className="meter-bar">
        <div
          className={clsx('meter-fill', fillColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
