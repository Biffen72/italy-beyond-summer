import type { Config } from "tailwindcss";

// Design tokens carried over from the Italy Beyond Summer presentation deck,
// elevated for web: Fraunces (display) + Inter (body) instead of Cambria/Calibri.
// wine/olive nudged slightly toward true red/green (Italian flag colors) for
// a bit more Italian character, while staying close enough to the deck's
// original wine-and-olive-grove palette not to clash with existing materials.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: { DEFAULT: "#8A1F2A", dark: "#671826" },
        ink: { DEFAULT: "#1E2A22", text: "#25302A" },
        olive: { DEFAULT: "#3F6E44", light: "#5A9D66" },
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
