/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a5f',
        secondary: '#f5a623',
        success: '#27ae60',
        danger: '#e74c3c',
        background: '#f0f4f8',
        textMain: '#2c3e50',
      }
    },
  },
  plugins: [],
}
