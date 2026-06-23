/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Pozadí a povrch
        bg:           '#F7F6F3',
        'bg-alt':     '#EFEDE9',
        surface:      '#FFFFFF',
        'surface-alt':'#F2F1EE',
        border:       '#E2DED8',
        'border-strong':'#C8C3BB',

        // Text
        text:          '#111111',
        'text-secondary':'#555555',
        'text-muted':  '#888888',
        'text-disabled':'#BBBBBB',
        'text-inverse': '#FFFFFF',

        // Akcent — Hráč (oranžová)
        player:        '#F97316',
        'player-light':'#FED7AA',
        'player-fade': '#FFF7ED',
        'player-dark': '#C2410C',

        // Akcent — Trenér (růžová/červená)
        coach:         '#F43F5E',
        'coach-light': '#FECDD3',
        'coach-fade':  '#FFF1F2',
        'coach-dark':  '#BE123C',

        // Akcent — Klub (žlutá)
        club:          '#EAB308',
        'club-light':  '#FEF08A',
        'club-fade':   '#FEFCE8',
        'club-dark':   '#A16207',

        // Stavové
        success: '#16A34A',
        warning: '#D97706',
        error:   '#DC2626',
        info:    '#2563EB',
      },
      fontSize: {
        // 4 stupně typografie
        'title':   ['36px', { lineHeight: '42px', fontWeight: '800' }],
        'heading': ['20px', { lineHeight: '26px', fontWeight: '700' }],
        'body':    ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
      },
    },
  },
  plugins: [],
};
