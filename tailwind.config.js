/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        income: '#22c55e',
        expense: '#ef4444',
        due: '#f59e0b',
        surface: '#111318',
        surfaceRaised: '#1a1d24',
      },
    },
  },
  plugins: [],
};
