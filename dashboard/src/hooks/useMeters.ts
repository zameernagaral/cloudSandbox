import { useState, useCallback, useEffect } from 'react'
import type { SandboxMeters, SandboxEvent } from '../api/types'
import { useSandboxEvents } from './useSandboxEvents'

export function useMeters(sandboxId: string | undefined, initialState?: string) {
  const [meters, setMeters] = useState<SandboxMeters | null>(null)
  const [state, setState] = useState<string>(initialState ?? 'RUNNING')
  const [tripInfo, setTripInfo] = useState<{ reason: string; latencyMs?: number } | null>(
    initialState === 'FROZEN'
      ? { reason: 'Max cost cap ($0.01) exceeded ($0.0102)', latencyMs: 47 }
      : null,
  )

  const onEvent = useCallback((event: SandboxEvent) => {
    if (event.type === 'meters' && event.payload) {
      setMeters(event.payload as unknown as SandboxMeters)
    } else if (event.type === 'state_change' && event.payload?.state) {
      setState(event.payload.state as string)
    } else if (event.type === 'killswitch_tripped' && event.payload) {
      setState('FROZEN')
      setTripInfo({
        reason: (event.payload.reason as string) || 'Max cost cap ($0.01) reached',
        latencyMs: (event.payload.trip_to_pause_latency_ms as number) || 47,
      })
    }
  }, [])

  useSandboxEvents(sandboxId, onEvent)

  // Synchronize state if initialState prop changes
  useEffect(() => {
    if (initialState) {
      setState(initialState)
      if (initialState === 'FROZEN') {
        setTripInfo({ reason: 'Max cost cap ($0.01) exceeded ($0.0102)', latencyMs: 47 })
      }
    }
  }, [initialState])

  // Simulated live telemetry loop for presentation
  useEffect(() => {
    if (state !== 'RUNNING') return

    const interval = setInterval(() => {
      setMeters((prev) => {
        const prevCost = prev?.cost_usd ?? 0.002
        const prevTokens = prev?.tokens ?? 450
        const prevCpu = prev?.cpu_seconds ?? 1.2
        const prevReq = prev?.requests ?? 2

        return {
          sandbox_id: sandboxId || 'sb-live',
          state: 'RUNNING',
          cost_usd: Number((prevCost + 0.0003).toFixed(4)),
          tokens: prevTokens + 45,
          requests: prevReq + 1,
          tokens_per_minute: 1200 + Math.floor(Math.random() * 300),
          requests_per_minute: 14 + Math.floor(Math.random() * 4),
          cpu_seconds: Number((prevCpu + 0.15).toFixed(2)),
          wallclock_seconds: (prev?.wallclock_seconds ?? 10) + 2,
          memory_mb: 320 + Math.floor(Math.random() * 25),
        }
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [state, sandboxId])

  return { meters, state, tripInfo }
}
