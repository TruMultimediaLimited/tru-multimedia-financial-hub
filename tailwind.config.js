/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        primaryHover: '#1D4ED8',
        income: '#16A34A',
        expense: '#DC2626',
        due: '#f59e0b',
        info: '#0EA5E9',
        surface: '#F8FAFC',
        surfaceRaised: '#ffffff',
      },
    },
  },
  plugins: [],
};
