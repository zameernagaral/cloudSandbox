import React from 'react'
import clsx from 'clsx'

interface MeterBarProps {
  label: string
  value: number
  max: number
  unit?: string
  color?: 'accent' | 'success' | 'warning' | 'danger' | 'frozen'
}

export function MeterBar({ label, value, max, unit = '', color = 'accent' }: MeterBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const dangerZone = pct >= 90
  const fillColor = dangerZone
    ? 'bg-danger'
    : pct >= 75
    ? 'bg-warning'
    : color === 'accent'
    ? 'bg-accent'
    : `bg-${color}`

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-text-dim">
        <span>{label}</span>
        <span className={dangerZone ? 'text-danger font-medium' : ''}>
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
