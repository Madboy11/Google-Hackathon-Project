/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'grotesk': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        'inter': ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        nexus: {
          bg: '#0a0a0a',
          surface: '#111111',
          elevated: '#1a1a1a',
          border: '#222222',
          'border-active': '#333333',
          muted: '#666666',
          subtle: '#444444',
          text: '#e5e5e5',
          'text-secondary': '#999999',
          accent: '#ffffff',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
