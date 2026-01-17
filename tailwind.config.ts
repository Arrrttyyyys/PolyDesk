import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "oklch(0.08 0.01 240)",
        card: "oklch(0.12 0.01 240)",
        primary: "oklch(0.75 0.2 145)",
        accent: "oklch(0.65 0.2 25)",
        "muted-foreground": "oklch(0.6 0 0)",
        foreground: "oklch(0.95 0 0)",
        border: "oklch(0.25 0.01 240)",
        secondary: "oklch(0.18 0.01 240)",
        input: "oklch(0.15 0.01 240)",
      },
      fontFamily: {
        sans: ["Inter", "Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
