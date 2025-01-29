/* @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}", // Si estás usando React, ajusta las extensiones si es necesario
    ],
    variants: {
      extend: {
        backdropBlur: ['responsive'],
      },
    },
    theme: {
      extend: {},
    },
    plugins: [],
  };
  