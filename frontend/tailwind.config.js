/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        farm: {
          50: '#f2f9f5',
          100: '#e1f2e7',
          200: '#c5e5d3',
          300: '#9bd2b5',
          400: '#69b891',
          500: '#449c74',
          600: '#327f5c',
          700: '#2a654b',
          800: '#24513d',
          900: '#1f4334',
          950: '#10251d',
        },
        risk: {
          low: '#10B981',
          medium: '#F59E0B',
          high: '#EF4444',
          unknown: '#6B7280',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
