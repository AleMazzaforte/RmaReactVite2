/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx, cjs, mjs}",
    "./node_modules/@reactvitefront/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}