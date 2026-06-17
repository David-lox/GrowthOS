/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#eef2ff',
        },
        surface: '#f8fafc',
        border: '#e2e8f0',
        'bg-hover': '#f1f5f9',
        'text-primary': '#0f172a',
        'text-secondary': '#64748b',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 150ms ease-out',
      },
    },
  },
  plugins: [],
}

