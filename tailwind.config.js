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
        dairy: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#9af5df',
          300: '#5ee7cb',
          400: '#2cd0b2',
          500: '#10b497',
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
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
      }
    },
  },
  plugins: [],
}
