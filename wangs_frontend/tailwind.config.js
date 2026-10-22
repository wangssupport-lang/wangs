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
          50: '#F4F7F5',
          100: '#E5EDE8',
          200: '#CADBD1',
          300: '#A4C2B2',
          400: '#7AA390',
          500: '#568471',
          600: '#41695A',
          700: '#345448',
          800: '#2A433A',
          900: '#152C23',
          950: '#0B1813',
        },
        cream: {
          50: '#FCFAF6',
          100: '#F7F3EB',
          200: '#EFE8DA',
          300: '#E2D6C0',
          400: '#D2C1A1',
          500: '#C0AA83',
        },
        earth: {
          500: '#8A5D4D',
          600: '#734B3C',
          700: '#5C3A2E',
          800: '#452A20',
          900: '#2F1B14',
        },
        chilli: {
          50: '#FFF1F0',
          100: '#FFE1DF',
          200: '#FFC7C3',
          500: '#F04438',
          600: '#D92D20',
          700: '#B42318',
          800: '#912018',
          900: '#7A1C16',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card': '0 4px 20px -2px rgba(20, 44, 35, 0.06), 0 2px 6px -1px rgba(20, 44, 35, 0.03)',
        'card-hover': '0 12px 30px -4px rgba(20, 44, 35, 0.12), 0 4px 10px -2px rgba(20, 44, 35, 0.04)',
      }
    },
  },
  plugins: [],
}
