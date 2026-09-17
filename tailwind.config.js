/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./template.html", "./content/**/*.html"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0f1a",
        },
        ink: {
          DEFAULT: "#e2e8f0",
          muted: "#94a3b8",
        },
        accent: {
          DEFAULT: "#7ec8e3",
        },
      },
    },
  },
  plugins: [],
};
