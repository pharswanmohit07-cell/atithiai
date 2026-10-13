/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Barlow", "sans-serif"],
        serif: ["Barlow Condensed", "sans-serif"],
        accent: ["Fraunces", "Georgia", "serif"],
        display: ["Bebas Neue", "Barlow Condensed", "sans-serif"],
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
      backgroundImage: {
        "sunrise": "linear-gradient(120deg, rgb(var(--brand-rgb)) 0%, rgb(var(--indigo-rgb)) 58%, rgb(var(--coral-rgb)) 120%)",
        "sunrise-warm": "linear-gradient(120deg, rgb(var(--amber-rgb)) 0%, rgb(var(--coral-rgb)) 100%)",
        "destination-haze": "radial-gradient(ellipse at 10% 0%, rgb(var(--amber-rgb) / 0.18), transparent 38%), radial-gradient(ellipse at 90% 35%, rgb(var(--teal-rgb) / 0.18), transparent 42%)",
      },
      boxShadow: {
        glow: "0 10px 28px rgb(var(--brand-rgb) / 0.22)",
        "glow-amber": "0 8px 24px rgb(var(--amber-rgb) / 0.25)",
        glass: "0 16px 40px rgb(11 29 43 / 0.18)",
      },
      minHeight: { touch: "44px" },
      minWidth: { touch: "44px" },
      borderRadius: { "4xl": "2rem" },
    },
  },
  plugins: [],
};
