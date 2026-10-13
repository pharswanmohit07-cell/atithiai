import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const baseRules = {
  "no-undef": "error",
  "no-unused-vars": ["warn", {
    argsIgnorePattern: "^_",
    caughtErrors: "none",
    varsIgnorePattern: "^_"
  }]
};

export default [
  {
    ignores: ["dist/**", "node_modules/**", ".netlify/**", "coverage/**"]
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser
    },
    plugins: {
      react,
      "react-hooks": reactHooks
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      ...baseRules,
      "react/jsx-no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  },
  {
    files: [
      "api/**/*.{js,mjs}",
      "netlify/**/*.{js,mjs}",
      "scripts/**/*.{js,mjs}",
      "vite.config.js",
      "tailwind.config.js",
      "postcss.config.js",
      "eslint.config.js"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node
    },
    rules: baseRules
  }
];
