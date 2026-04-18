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
        "medwork-surface": "#f7f8fa",
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans:  ["'DM Sans'", "system-ui", "sans-serif"],
        mono:  ["'DM Mono'", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "1.4", letterSpacing: "0.06em" }],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "4px",
        lg: "12px",
        xl: "16px",
        "2xl": "12px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(12,30,48,0.04)",
        sm: "0 2px 8px rgba(12,30,48,0.06), 0 1px 2px rgba(12,30,48,0.04)",
        md: "0 4px 16px rgba(12,30,48,0.08), 0 1px 4px rgba(12,30,48,0.04)",
        lg: "0 8px 32px rgba(12,30,48,0.1), 0 2px 8px rgba(12,30,48,0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease",
        "slide-up": "slideUp 0.22s ease",
      },
    },
  },
  plugins: [],
} satisfies Config;