/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          'surface-2': 'var(--surface-2)',
          border: 'var(--border)',
          text: 'var(--text)',
          muted: 'var(--text-muted)',
          primary: 'var(--primary)',
          accent: 'var(--accent)',
          sidebar: 'var(--sidebar)',
        },
        dark: {
          bg: '#0B1210',
          sidebar: '#0F1A17',
          surface: '#131F1B',
          elevated: '#1A2A25',
          border: '#24352F',
          text: '#E7F0EC',
          muted: '#8FA69C',
        },
        dairy: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#9af5df',
          300: '#5ee7cb',
          400: '#2cd0b2',
          500: '#10b981',
          600: '#0a907b',
          700: '#0c7364',
          800: '#0e5b51',
          900: '#104c44',
          950: '#042b27',
        },
        brand: {
          blue: '#1e40af',
          gold: '#d97706',
          milk: '#f8fafc',
          cream: '#fef3c7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        'dark-card': '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.96)' },
        },
        'tick-draw': {
          '0%': { strokeDashoffset: '48' },
          '100%': { strokeDashoffset: '0' },
        }
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite linear',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'tick-draw': 'tick-draw 0.35s ease-out forwards',
      }
    },
  },
  plugins: [],
}
