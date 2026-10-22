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
          50: '#f2f7f4',
          100: '#e1ede6',
          200: '#c5dcd0',
          300: '#9ec3b1',
          400: '#71a38e',
          500: '#4f8570',
          600: '#3c6b59',
          700: '#315648',
          800: '#1e382f',
          900: '#142721',
          950: '#0b1613',
        },
        cream: {
          50: '#fdfbf7',
          100: '#fbf7f0',
          200: '#f5eee1',
          300: '#eee3cd',
          400: '#e3d2b2',
          500: '#d5bd95',
        },
        earth: {
          700: '#6d4c41',
          800: '#51372f',
          900: '#38251f',
        },
        chilli: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
