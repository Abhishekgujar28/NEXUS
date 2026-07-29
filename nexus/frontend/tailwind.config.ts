import type { Config } from 'tailwindcss';

/**
 * NEXUS design tokens.
 *
 * Aesthetic: editorial research tool. Warm charcoal ink, off-white paper,
 * a single citrine accent used sparingly. Generous whitespace and calm
 * typography — think Linear, Are.na, and Reuters rolled into one.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        // Ink = foreground / warm neutrals. Paper = surfaces.
        ink: {
          50: '#F7F6F3',
          100: '#EDEBE4',
          200: '#D9D5C8',
          300: '#B8B2A0',
          400: '#8A8474',
          500: '#5F5A4E',
          600: '#3C3A33',
          700: '#25241F',
          800: '#171612',
          900: '#0E0D0A',
          950: '#08070500',
        },
        paper: {
          DEFAULT: '#FBFAF6',
          soft: '#F5F3EC',
          sink: '#EDEAE0',
        },
        // Citrine — the signature accent. Sparing use.
        citrine: {
          50: '#F8FCE4',
          100: '#EFF8BF',
          200: '#DEEF80',
          300: '#C9E24A',
          400: '#B4D024',
          500: '#98B216',
          600: '#748A0F',
          700: '#556710',
          800: '#3C4A0F',
          900: '#232B08',
        },
        // Support colors (used carefully)
        clay: {
          400: '#E8927A',
          500: '#D97757',
          600: '#B85D3F',
        },
        amber: {
          400: '#F5C563',
          500: '#E4A93F',
          600: '#B98420',
        },
        moss: {
          400: '#8DB37C',
          500: '#5F8E56',
          600: '#456B3F',
        },
        // Semantic
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          raised: 'hsl(var(--surface-raised))',
          sink: 'hsl(var(--surface-sink))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Editorial scale
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
      },
      letterSpacing: {
        tightest: '-0.03em',
        display: '-0.025em',
      },
      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px',
        xs: '4px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(20, 20, 15, 0.04), 0 1px 2px 0 rgba(20, 20, 15, 0.04)',
        pop: '0 8px 24px -6px rgba(10, 10, 8, 0.18), 0 2px 6px -2px rgba(10, 10, 8, 0.10)',
        glow: '0 0 0 4px hsl(var(--accent) / 0.12)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'accent-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--accent) / 0.35)' },
          '50%': { boxShadow: '0 0 0 6px hsl(var(--accent) / 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-in-up': 'fade-in-up 220ms ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
        'accent-pulse': 'accent-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
