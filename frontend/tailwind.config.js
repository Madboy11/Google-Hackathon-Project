/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Base layers
        background: '#04060f',
        surface:    '#0b0f1e',
        'surface-2':'#111827',
        // Brand accents — Gemini iridescent palette
        accent:   '#6366f1',   // indigo
        'accent-cyan':   '#06b6d4',
        'accent-violet': '#8b5cf6',
        'accent-teal':   '#14b8a6',
        danger:  '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        // Text
        'text-primary': '#f1f5f9',
        'text-muted':   '#64748b',
        'text-dim':     '#334155',
      },
      fontFamily: {
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':      'shimmer 2s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'glow-pulse':   'glow-pulse 3s ease-in-out infinite',
        'slide-in':     'slide-in 0.25s cubic-bezier(0.16,1,0.3,1)',
        'fade-up':      'fade-up 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-6px)' },
        },
        'glow-pulse': {
          '0%,100%': { boxShadow: '0 0 8px rgba(99,102,241,0.3)' },
          '50%':     { boxShadow: '0 0 24px rgba(99,102,241,0.6), 0 0 48px rgba(139,92,246,0.2)' },
        },
        'slide-in': {
          '0%':   { transform: 'translateX(100%) scale(0.96)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)',       opacity: '1' },
        },
        'fade-up': {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
      },
      boxShadow: {
        'glass':      '0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)',
        'glow-sm':    '0 0 12px rgba(99,102,241,0.25)',
        'glow-md':    '0 0 24px rgba(99,102,241,0.35)',
        'glow-cyan':  '0 0 16px rgba(6,182,212,0.3)',
        'glow-red':   '0 0 16px rgba(239,68,68,0.25)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
