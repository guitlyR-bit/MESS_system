/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D9148',
          dark: '#1A6130',
          light: '#4CAF50',
        },
        accent: {
          DEFAULT: '#CDDC39',
        },
        surface: {
          DEFAULT: '#1A2634',
          dark: '#0F1923',
          card: '#1E2D3D',
        },
      },
    },
  },
  plugins: [],
};
