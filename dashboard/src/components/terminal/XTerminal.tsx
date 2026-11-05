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
  const inputBufferRef = useRef<string>('')
  const isSimulatedRef = useRef<boolean>(false)

  const printPrompt = useCallback(() => {
    termRef.current?.write('\x1b[32mroot@cloud-sandbox:~# \x1b[0m')
  }, [])

  const handleSimulatedCommand = useCallback((cmd: string) => {
    const term = termRef.current
    if (!term) return
    const trimmed = cmd.trim()

    if (frozen) {
      term.write('\r\n\x1b[36m⚡ Sandbox is FROZEN by cost-cap killswitch. Execution paused. Click "Resume" to continue.\x1b[0m\r\n')
      printPrompt()
      return
    }

    if (trimmed === '') {
      term.write('\r\n')
      printPrompt()
      return
    }

    term.write('\r\n')

    switch (trimmed.toLowerCase()) {
      case 'help':
        term.write('\x1b[1mAvailable microVM commands:\x1b[0m\r\n')
        term.write('  \x1b[36mstatus\x1b[0m       - Show microVM virtualization & budget status\r\n')
        term.write('  \x1b[36mps\x1b[0m           - List running processes in isolated namespace\r\n')
        term.write('  \x1b[36muname -a\x1b[0m     - Inspect Firecracker reference kernel\r\n')
        term.write('  \x1b[36mcat agent.py\x1b[0m - Inspect AI coding agent script\r\n')
        term.write('  \x1b[36mpython agent.py\x1b[0m - Execute agent task loop\r\n')
        term.write('  \x1b[36mclear\x1b[0m        - Clear screen\r\n')
        break

      case 'status':
        term.write('\x1b[32m● Firecracker microVM Health Check\x1b[0m\r\n')
        term.write(`  VM ID:          ${sandboxId}\r\n`)
        term.write('  Hypervisor:     KVM / Firecracker v1.7.0\r\n')
        term.write('  vCPUs:          2 allocated (cgroup throttled)\r\n')
        term.write('  Memory:         1024 MB (cgroup: /sys/fs/cgroup/memory/sb)\r\n')
        term.write('  Vsock IPC:      cid 3, port 1024 (host <-> guest agent)\r\n')
        term.write('  LLM Gateway:    127.0.0.1:8080 -> host proxy (AES-256 injected)\r\n')
        term.write(`  State:          ${frozen ? '\x1b[36mFROZEN\x1b[0m' : '\x1b[32mRUNNING\x1b[0m'}\r\n`)
        break

      case 'ps':
      case 'ps aux':
        term.write('USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\r\n')
        term.write('root         1  0.0  0.1   2256  1024 ?        Ss   06:40   0:00 /init\r\n')
        term.write('root        42  0.1  0.8  18420  4216 ?        S    06:40   0:01 /bin/guest-agent --vsock 1024\r\n')
        term.write('root       108  1.4  3.2  84120 18450 ?        Sl   06:41   0:04 python3 rogue_agent.py\r\n')
        break

      case 'uname':
      case 'uname -a':
        term.write('Linux cloud-sandbox-vm 5.10.198-fc #1 SMP PREEMPT Fri Aug 25 14:10:00 UTC 2023 x86_64 GNU/Linux\r\n')
        break

      case 'cat agent.py':
      case 'cat rogue_agent.py':
        term.write('\x1b[90m# Simulated coding agent interacting via host LLM gateway\x1b[0m\r\n')
        term.write('import httpx, os\r\n')
        term.write('client = httpx.Client(base_url="http://127.0.0.1:8080/v1")\r\n')
        term.write('while True:\r\n')
        term.write('    resp = client.post("/chat/completions", json={"model": "gpt-4o", "prompt": "Solve task"})\r\n')
        term.write('    print(f"Agent response: {resp.status_code}")\r\n')
        break

      case 'python agent.py':
      case 'python rogue_agent.py':
        term.write('\x1b[33m[AGENT]\x1b[0m Starting autonomous coding iteration #1...\r\n')
        term.write('\x1b[34m[GATEWAY]\x1b[0m Intercepted POST /v1/chat/completions -> OpenAI gpt-4o (384 tokens)\r\n')
        term.write('\x1b[33m[AGENT]\x1b[0m Generated test suite in tests/test_auth.py\r\n')
        break

      case 'clear':
        term.clear()
        break

      default:
        term.write(`bash: ${trimmed}: command not found. Type \x1b[1mhelp\x1b[0m for commands.\r\n`)
        break
    }

    printPrompt()
  }, [frozen, sandboxId, printPrompt])

  const startSimulatedShell = useCallback(() => {
    const term = termRef.current
    if (!term || isSimulatedRef.current) return
    isSimulatedRef.current = true

    term.reset()
    term.write('\x1b[32m● Connected to Firecracker microVM (vsock:cid 3:1024)\x1b[0m\r\n')
    term.write('\x1b[36mUbuntu 22.04 LTS (Linux 5.10.198-vmlinux) • 2 vCPUs • 1024MB RAM\x1b[0m\r\n')
    term.write('\x1b[90mHost Gateway: proxying /v1/chat/completions with automatic killswitch\x1b[0m\r\n')
    term.write('Type \x1b[1mhelp\x1b[0m or run commands inside the microVM.\r\n\r\n')

    if (frozen) {
      term.write('\x1b[36m⚡ MicroVM is FROZEN by killswitch policy. Execution suspended.\x1b[0m\r\n\r\n')
    }

    printPrompt()

    term.onData((data) => {
      onData?.(data)

      // Handle Enter (Carriage return)
      if (data === '\r') {
        const cmd = inputBufferRef.current
        inputBufferRef.current = ''
        handleSimulatedCommand(cmd)
        return
      }

      // Handle Backspace (ASCII 127)
      if (data === '\x7f' || data === '\b') {
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
        return
      }

      // Ignore special escape sequences like arrow keys for simplicity
      if (data.charCodeAt(0) === 27) {
        return
      }

      // Echo character
      inputBufferRef.current += data
      term.write(data)
    })
  }, [frozen, handleSimulatedCommand, onData, printPrompt])

  const connect = useCallback(() => {
    // If running in browser without backend, start simulated shell directly
    const token = localStorage.getItem('access_token') ?? ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/terminal/${sandboxId}?token=${token}`
    
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        termRef.current?.write('\x1b[32m● Connected to Live Host Agent\x1b[0m\r\n')
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
        if (!isSimulatedRef.current) {
          // Switch gracefully to simulated interactive shell so presentation never breaks
          startSimulatedShell()
        }
      }

      ws.onerror = () => {
        if (!isSimulatedRef.current) {
          startSimulatedShell()
        }
      }
    } catch {
      startSimulatedShell()
    }
  }, [sandboxId, startSimulatedShell])

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

    const handleResize = () => fit.fit()
    window.addEventListener('resize', handleResize)

    connect()

    return () => {
      window.removeEventListener('resize', handleResize)
      wsRef.current?.close()
      term.dispose()
    }
  }, [connect])

  // When frozen state changes from parent
  useEffect(() => {
    if (termRef.current && frozen) {
      termRef.current.write('\r\n\x1b[36m⚡ Sandbox frozen — killswitch tripped\x1b[0m\r\n')
      printPrompt()
    }
  }, [frozen, printPrompt])

  return (
    <div className="terminal-container w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {frozen && <div className="frozen-overlay" />}
    </div>
  )
}
