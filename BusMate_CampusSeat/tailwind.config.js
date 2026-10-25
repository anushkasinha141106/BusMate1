/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bgMain: '#F8FAFC',
        cardBg: '#FFFFFF',
        brandPrimary: '#075985',
        brandHover: '#0C4A6E',
        brandSecondary: '#0F766E',
        textMain: '#172033',
        textSecondary: '#475569',
        borderColor: '#CBD5E1',
        statusSuccess: '#15803D',
        statusWarning: '#B45309',
        statusError: '#B91C1C',
        redbus: {
          primary: '#D84E55',
          hover: '#C23E44',
          dark: '#991B1B',
          light: '#FFF5F5',
          gray: '#F8F9FA',
          border: '#E2E8F0',
        },
      },
    },
  },
  plugins: [],
}
