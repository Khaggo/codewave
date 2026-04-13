/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/screens/**/*.{js,jsx}',
    './src/hooks/**/*.{js,jsx}',
    './src/lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand (CruisersCrib logo palette) ─────────────────
        'brand-orange': 'rgb(240 124 0 / <alpha-value>)',   // #f07c00
        'brand-gold':   'rgb(201 149 26 / <alpha-value>)',  // #c9951a
        // ── Dark surfaces ─────────────────────────────────────
        'surface-bg':     '#09090b',   // page
        'surface-card':   '#111113',   // card
        'surface-raised': '#18181b',   // elevated (modals, dropdowns)
        'surface-input':  '#141416',   // input bg
        'surface-hover':  '#1c1c1f',   // hover state
        'surface-border': '#27272a',   // border
        // ── Ink ───────────────────────────────────────────────
        'ink-primary':   '#f4f4f5',
        'ink-secondary': '#a1a1aa',
        'ink-muted':     '#52525b',
        'ink-dim':       '#3f3f46',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:         '0 1px 4px rgba(0,0,0,0.7)',
        'card-md':    '0 4px 20px rgba(0,0,0,0.8)',
        'glow-orange':'0 0 24px rgba(240,124,0,0.18)',
        'glow-sm':    '0 0 10px rgba(240,124,0,0.1)',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up':       'slide-up 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'fade-in':        'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
