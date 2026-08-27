import type { Config } from "tailwindcss";

// Design tokens carried over from the Italy Beyond Summer presentation deck,
// elevated for web: Fraunces (display) + Inter (body) instead of Cambria/Calibri.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: { DEFAULT: "#7A2333", dark: "#5A1926" },
        ink: { DEFAULT: "#1E2A22", text: "#25302A" },
        olive: { DEFAULT: "#57643C", light: "#7C8F5A" },
        gold: { DEFAULT: "#BB8F2B", light: "#D9B65C" },
        paper: "#FBF8EF",
        line: "#D8CBA6",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
