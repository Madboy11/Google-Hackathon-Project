/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0F1E',
        surface: '#111827',
        accent: '#3B82F6',
        danger: '#EF4444',
        success: '#10B981',
        'text-primary': '#F9FAFB',
        'text-muted': '#6B7280',
      },
      fontFamily: {
        'grotesk': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        'inter': ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
