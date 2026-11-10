/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens from docs/TOKENS.md ("Containment Airlock")
        'bg-base': '#0B0D13',
        'surface-bulkhead': '#161B26',
        'surface-elevated': '#1E2536',
        'rule-frame': '#2B3448',
        'ink-primary': '#F1F5F9',
        'ink-muted': '#94A3B8',
        'signal-hazard': '#F59E0B',
        'signal-breach': '#EF4444',

        // Backwards compatibility mappings for existing components
        bg: '#0B0D13',
        surface: '#161B26',
        border: '#2B3448',
        accent: '#F59E0B',
        'accent-glow': '#D97706',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        frozen: '#06B6D4',
        muted: '#94A3B8',
        text: '#F1F5F9',
        'text-dim': '#94A3B8',
      },
      fontFamily: {
        display: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fragment Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        md: '6px',
        full: '9999px',
      },
      boxShadow: {
        bulkhead: '0 1px 3px 0 rgba(0, 0, 0, 0.5)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.28)',
      },
      transitionDuration: {
        fast: '120ms',
        normal: '240ms',
        slow: '480ms',
      },
      transitionTimingFunction: {
        mechanical: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'fade-in': 'fade-in 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 16px rgba(245, 158, 11, 0.6)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
