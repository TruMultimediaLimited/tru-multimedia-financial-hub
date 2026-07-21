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
        surface: '#23262d',
        surfaceRaised: '#2f333c',
      },
    },
  },
  plugins: [],
};
