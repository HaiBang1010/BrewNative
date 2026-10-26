/** @type {import('tailwindcss').Config} */
module.exports = {
  // Every file that uses className must be listed here.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand coffee color. Use as bg-brand, text-brand, bg-brand-50...
        brand: {
          DEFAULT: '#7C4A2D',
          50: '#FBF6F2',
          100: '#F3E6DC',
          200: '#E4C8B3',
          500: '#9A5E3A',
          600: '#7C4A2D',
          700: '#5E3721',
        },
      },
    },
  },
  plugins: [],
};
