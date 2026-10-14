/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Georgia", "serif"],
        accent: ["Georgia", "serif"],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2-rgb) / <alpha-value>)",
        text: "rgb(var(--text-rgb) / <alpha-value>)",
        muted: "rgb(var(--text-muted-rgb) / <alpha-value>)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        brand: "rgb(var(--brand-rgb) / <alpha-value>)",
        indigo: "rgb(var(--indigo-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        amber: "rgb(var(--amber-rgb) / <alpha-value>)",
        coral: "rgb(var(--coral-rgb) / <alpha-value>)",
        teal: "rgb(var(--teal-rgb) / <alpha-value>)",
        "accent-text": "rgb(var(--accent-text-rgb) / <alpha-value>)",
        "destination-accent": "rgb(var(--destination-accent-rgb) / <alpha-value>)",
      },
      boxShadow: { glass: "0 2px 12px rgb(0 0 0 / 0.06)" },
      minHeight: { touch: "44px" },
      minWidth: { touch: "44px" },
      borderRadius: { "4xl": "2rem" },
    },
  },
  plugins: [],
};
