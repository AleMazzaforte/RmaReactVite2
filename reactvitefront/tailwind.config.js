// /** @type {import('tailwindcss').Config} */
// export const content = [
//   "./index.html",
//   "./src/**/*.{js,ts,jsx,tsx}",
// ];
// export const theme = {
//   extend: {},
// };
// export const plugins = [];


/** @type {import('tailwindcss').Config} */
export const content = [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
];

// tailwind.config.js
export const theme = {
  extend: {
    animation: {
      'fadeIn': 'fadeIn 0.4s ease-out',
      'fadeOut': 'fadeOut 0.35s ease-in',
    },
    keyframes: {
      fadeIn: {
        '0%': { opacity: '0', transform: 'translateY(4px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' }
      },
      fadeOut: {
        '0%': { opacity: '1', transform: 'translateY(0)' },
        '100%': { opacity: '0', transform: 'translateY(4px)' }
      }
    }
  }
}

export const plugins = [
  // Plugin para clases personalizadas
  function({ addComponents }) {
    addComponents({
      '.swal2-popup': {
        '@apply rounded-2xl shadow-xl p-6 font-sans': {},
        '&.swal2-success': {
          '@apply border-l-4 border-swal-success': {}
        },
        '&.swal2-error': {
          '@apply border-l-4 border-swal-error': {}
        }
      },
      '.swal2-confirm': {
        '@apply bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors': {}
      },
      '.swal2-cancel': {
        '@apply bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg ml-2 transition-colors': {}
      }
    });
  }
];
  