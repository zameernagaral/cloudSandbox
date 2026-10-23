import React, { useEffect, useRef, useCallback } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

interface XTerminalProps {
  sandboxId: string
  frozen?: boolean
  onData?: (data: string) => void
}

export function XTerminal({ sandboxId, frozen = false, onData }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token') ?? ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/terminal/${sandboxId}?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      termRef.current?.write('\x1b[32m● Connected\x1b[0m\r\n')
    }

    ws.onmessage = (e) => {
      if (typeof e.data === 'string') {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'frozen') {
            termRef.current?.write('\r\n\x1b[36m⚡ Sandbox frozen — killswitch tripped\x1b[0m\r\n')
          } else if (msg.type === 'error') {
            termRef.current?.write(`\r\n\x1b[31m✗ ${msg.message}\x1b[0m\r\n`)
          }
        } catch {
          termRef.current?.write(e.data)
        }
      } else {
        e.data.arrayBuffer().then((buf: ArrayBuffer) => {
          termRef.current?.write(new Uint8Array(buf))
        })
      }
    }

    ws.onclose = () => {
      if (!frozen) {
        termRef.current?.write('\r\n\x1b[33m● Disconnected — reconnecting...\x1b[0m\r\n')
        setTimeout(connect, 2000)
      }
    }

    ws.onerror = () => ws.close()
  }, [sandboxId, frozen])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: {
        background: '#0A0B0F',
        foreground: '#E5E7EB',
        cursor: '#5B6AF0',
        cursorAccent: '#0A0B0F',
        selectionBackground: 'rgba(91, 106, 240, 0.3)',
        black: '#1E2028',
        red: '#EF4444',
        green: '#22C55E',
        yellow: '#F59E0B',
        blue: '#5B6AF0',
        magenta: '#8B5CF6',
        cyan: '#06B6D4',
        white: '#E5E7EB',
        brightBlack: '#6B7280',
        brightRed: '#F87171',
        brightGreen: '#4ADE80',
        brightYellow: '#FCD34D',
        brightBlue: '#818CF8',
        brightMagenta: '#A78BFA',
        brightCyan: '#22D3EE',
        brightWhite: '#F9FAFB',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      scrollback: 5000,
    })

    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(containerRef.current)
    fit.fit()

    termRef.current = term
    fitRef.current = fit

    // Handle user input → send to WS
    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(data)
      }
      onData?.(data)
    })

    // Resize observer
    const ro = new ResizeObserver(() => {
      fit.fit()
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const dims = fit.proposeDimensions()
        if (dims) {
          wsRef.current.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }))
        }
      }
    })
    ro.observe(containerRef.current)

    connect()

    return () => {
      ro.disconnect()
      wsRef.current?.close()
      term.dispose()
    }
  }, [connect]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="terminal-container">
      <div ref={containerRef} className="w-full h-full" />
      {frozen && <div className="frozen-overlay" />}
    </div>
  )
}
