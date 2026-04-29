/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#3b82f6',
          DEFAULT: '#1d4ed8',
          dark: '#0f172a',
          violet: '#6d28d9',
          violetDark: '#4c1d95',
        }
      }
    },
  },
  plugins: [],
}
