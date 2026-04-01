/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        medwork: {
          navy: "#0d1f3c",
          cyan: "#00b4d8",
          success: "#16a34a",
          warning: "#f59e0b",
          danger: "#dc2626"
        }
      }
    }
  },
  plugins: []
};