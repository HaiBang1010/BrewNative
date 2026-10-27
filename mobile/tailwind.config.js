/** @type {import('tailwindcss').Config} */
module.exports = {
  // Every file that uses className must be listed here.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Palette of the Figma "Coffee Shop Mobile App" styleguide.
      // JS props that can't take a class (icon color, tintColor...) use
      // src/constants/theme.ts: keep both in sync.
      colors: {
        // Coffee brown. Use as bg-brand, text-brand, bg-brand-50...
        brand: {
          DEFAULT: '#C67C4E',
          50: '#F9F2ED',
          100: '#EDD6C8',
          200: '#E0B79C',
          500: '#C67C4E',
          600: '#B06A3F',
          700: '#94582F',
        },
        // Text: text-ink for titles, text-ink-soft for body, text-ink-muted for hints.
        ink: {
          DEFAULT: '#242424',
          strong: '#050505',
          soft: '#313131',
          muted: '#A2A2A2',
          subtle: '#909090',
        },
        // Borders and dividers.
        line: { DEFAULT: '#E3E3E3', light: '#EDEDED' },
        // Screen background.
        surface: '#F9F9F9',
        // Dark header of the home screen and the login screen.
        night: { DEFAULT: '#313131', deep: '#111111', raised: '#2A2A2A', black: '#050505' },
        promo: '#ED5151',
        // Done steps of the order progress bar.
        success: '#36C07E',
      },
      // One family per weight, named by each file's PostScript name (see app/_layout.tsx).
      // Don't use these directly: components/ui/text.tsx maps font-semibold etc. to them.
      fontFamily: {
        'sora-light': ['Sora-Light'],
        sora: ['Sora-Regular'],
        'sora-medium': ['Sora-Medium'],
        'sora-semibold': ['Sora-SemiBold'],
        'sora-bold': ['Sora-Bold'],
      },
    },
  },
  plugins: [],
};
