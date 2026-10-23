import { useEffect, useRef, useCallback } from 'react'
import type { SandboxEvent } from '../api/types'

export function useSandboxEvents(
  sandboxId: string | undefined,
  onEvent: (event: SandboxEvent) => void,
) {
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    if (!sandboxId) return
    const token = localStorage.getItem('access_token') ?? ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/events/${sandboxId}?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const event: SandboxEvent = JSON.parse(e.data)
        onEventRef.current(event)
      } catch {}
    }

    ws.onclose = () => {
      // Auto-reconnect after 2s
      setTimeout(connect, 2000)
    }

    ws.onerror = () => ws.close()
  }, [sandboxId])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])
}
