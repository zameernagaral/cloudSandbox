import { useState, useCallback } from 'react'
import type { SandboxMeters, SandboxEvent } from '../api/types'
import { useSandboxEvents } from './useSandboxEvents'

export function useMeters(sandboxId: string | undefined, initialState?: string) {
  const [meters, setMeters] = useState<SandboxMeters | null>(null)
  const [state, setState] = useState<string>(initialState ?? 'RUNNING')
  const [tripInfo, setTripInfo] = useState<{ reason: string; latencyMs?: number } | null>(null)

  const onEvent = useCallback((event: SandboxEvent) => {
    if (event.type === 'meters' && event.payload) {
      setMeters(event.payload as unknown as SandboxMeters)
    } else if (event.type === 'state_change' && event.payload?.state) {
      setState(event.payload.state as string)
    } else if (event.type === 'killswitch_tripped' && event.payload) {
      setState('FROZEN')
      setTripInfo({
        reason: event.payload.reason as string,
        latencyMs: event.payload.trip_to_pause_latency_ms as number | undefined,
      })
    }
  }, [])

  useSandboxEvents(sandboxId, onEvent)

  return { meters, state, tripInfo }
}
