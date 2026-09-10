/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // ─── Color Palette ───────────────────────────────────────────────────
      colors: {
        cream: {
          50:  '#FDFBF7',
          100: '#F9F5EC',
          200: '#F5F0E8',   // base background
          300: '#EDE5D5',
          400: '#DDD0B9',
        },
        ink: {
          900: '#1A1A14',   // near-black warm
          800: '#2A2A1E',
          700: '#3A3A2C',
          600: '#4A4A3A',
          500: '#5A5A48',
        },
        rust: {
          50:  '#FDF2EC',
          100: '#FBDEC9',
          200: '#F4B28A',
          300: '#E8814A',
          400: '#D5601E',
          500: '#C4541A',   // primary accent
          600: '#A34416',
          700: '#823512',
          800: '#61270D',
          900: '#401908',
        },
        olive: {
          50:  '#F2F5EE',
          100: '#D9E2CF',
          200: '#B3C59F',
          300: '#7EA36B',
          400: '#5E7C45',
          500: '#4A5C2F',   // secondary accent
          600: '#3C4B26',
          700: '#2E3A1C',
          800: '#202913',
          900: '#121809',
        },
        mustard: {
          50:  '#FDF8E8',
          100: '#FAEEBC',
          200: '#F5D980',
          300: '#EDBE44',
          400: '#DBA81C',
          500: '#D4A017',   // tertiary accent
          600: '#AF8312',
          700: '#8A660E',
          800: '#654909',
          900: '#402D05',
        },
      },

      // ─── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],    // bold geometric grotesk headlines
        body:    ['DM Sans', 'system-ui', 'sans-serif'], // clean body text
        mono:    ['JetBrains Mono', 'monospace'],        // labels, tags, code
        serif:   ['Playfair Display', 'Georgia', 'serif'], // italic accent lines
      },

      fontSize: {
        // Display scale
        'display-2xl': ['clamp(3.5rem, 8vw, 7rem)', { lineHeight: '1', letterSpacing: '-0.03em' }],
        'display-xl':  ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'display-lg':  ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md':  ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        // Mono label
        'label-sm': ['0.6875rem', { letterSpacing: '0.12em', lineHeight: '1.2' }],
        'label-md': ['0.75rem', { letterSpacing: '0.1em', lineHeight: '1.2' }],
      },

      // ─── Spacing ──────────────────────────────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '128': '32rem',
        '144': '36rem',
      },

      // ─── Animation ────────────────────────────────────────────────────────
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scan': {
          '0%':   { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'crack': {
          '0%':   { strokeDashoffset: '300' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'pulse-slow': 'pulse-slow 2.5s ease-in-out infinite',
        'crack': 'crack 0.8s ease-out forwards',
      },

      // ─── Borders ──────────────────────────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
};
