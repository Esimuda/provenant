import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1116",
        paper: "#F6F3EE",
        accent: "#E8572A",
        "accent-hover": "#F06A42",
        support: "#2F6B5E",
        line: "#E4DDD4",
        muted: "#5C564E",
        danger: "#8C2F22",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-text)", "Inter Tight", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(14,17,22,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
