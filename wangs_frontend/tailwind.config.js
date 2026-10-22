/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f1f7f4',
          100: '#dfede6',
          200: '#c1dcd0',
          300: '#95c2b0',
          400: '#67a38d',
          500: '#468672',
          600: '#346b5b',
          700: '#2b564a',
          800: '#1e3c34',
          900: '#142a25',
          950: '#0a1613',
        },
        cream: {
          50: '#fcfaf6',
          100: '#f8f4ec',
          200: '#f1ebdE',
          300: '#e5dcce',
          400: '#d5c7b3',
          500: '#c1af97',
        },
        earth: {
          700: '#5c3d2e',
          800: '#472d21',
          900: '#331e16',
        },
        chilli: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'artisan': '0 4px 20px -2px rgba(10, 22, 19, 0.06), 0 2px 6px -1px rgba(10, 22, 19, 0.04)',
        'artisan-hover': '0 16px 36px -6px rgba(10, 22, 19, 0.14), 0 4px 12px -2px rgba(10, 22, 19, 0.06)',
        'artisan-glow': '0 0 25px rgba(220, 38, 38, 0.2)',
      }
    },
  },
  plugins: [],
}
