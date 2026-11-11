/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af' },
        lab: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
      },
      // System fonts only: nothing to download, so it works offline and on slow links.
      // "Nirmala UI" is the Windows font that renders Kannada and Hindi.
      fontFamily: {
        sans: ['Inter', 'system-ui', '"Segoe UI"', '"Nirmala UI"', '"Noto Sans"', '"Noto Sans Kannada"', '"Noto Sans Devanagari"', 'Roboto', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(15,23,42,.05), 0 4px 16px rgba(15,23,42,.06)' },
    },
  },
  plugins: [],
};
