export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#3b82f6',
        trending: '#ef4444',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      screens: {
        xs: '320px',
      },
    },
  },
  plugins: [],
}
