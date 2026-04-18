import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "medwork-navy": "#0c1e30",
        "medwork-cyan": "#00aadd",
        "medwork-navy-deep": "#08151f",
        "medwork-navy-mid": "#142840",
        "medwork-surface": "#f4f6f8",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "12px",
      },
      boxShadow: {
        xs: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
        sm: "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
        md: "0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
        lg: "0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
} satisfies Config;