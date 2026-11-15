import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#162033",
        paper: "#F6F3EC",
        sand: "#E7E1D6",
        line: "#D9D2C5",
        signal: "#C6531A",
        pine: "#1E4D3A",
        moss: "#E7F3EC",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 18px 50px rgba(22, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
