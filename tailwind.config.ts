import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'], // IDs only: ORD-7, VOLT-0003, RCP-000007
      },
      // Type scale. Bold (600-700) is only for page titles, section titles and stat numbers.
      fontSize: {
        // Raised again so every page reads comfortably. Bold (600-700) is only for titles and stat numbers.
        xs: ['0.9375rem', { lineHeight: '1.4rem' }], // 15px
        sm: ['1.0625rem', { lineHeight: '1.6rem' }], // 17px
        base: ['1.1875rem', { lineHeight: '1.8rem' }], // 19px
        lg: ['1.3125rem', { lineHeight: '1.9rem' }], // 21px
        xl: ['1.625rem', { lineHeight: '2.1rem' }], // 26px
        '2xl': ['1.875rem', { lineHeight: '2.3rem' }], // 30px
        page: ['2.375rem', { lineHeight: '2.875rem', fontWeight: '700' }], // 38px page titles
        section: ['1.625rem', { lineHeight: '2.1rem', fontWeight: '600' }], // 26px section and card titles
        body: ['1.1875rem', { lineHeight: '1.8rem' }], // 19px
        cell: ['1.125rem', { lineHeight: '1.7rem' }], // 18px table cells
        label: ['0.9375rem', { lineHeight: '1.3rem', letterSpacing: '0.03em' }], // 15px, used uppercase
        stat: ['2.75rem', { lineHeight: '3rem', fontWeight: '700' }], // 44px stat numbers
      },
      colors: {
        // Emerald brand. 500 is the brand colour, 600 its hover, 700 the deep green for links, icons and focus rings.
        volt: {
          50: '#effef5',
          100: '#d9fde8',
          200: '#b4f9d2',
          300: '#79f2b0',
          400: '#37e286',
          500: '#0ec866',
          600: '#04a552',
          700: '#068244',
          800: '#0b6639',
          900: '#0b5431',
          950: '#002f19',
        },
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b1bac9',
          400: '#8694ab',
          500: '#677791',
          600: '#525f78',
          700: '#434e62',
          800: '#2b3240',
          900: '#1b202a',
          950: '#0f1218',
        },
        canvas: '#eef5f1', // page background
        line: '#e1e6ec', // 1px borders
        accent: '#0ec866', // active bar in the sidebar
        sidebar: { DEFAULT: '#0a3a2c', hover: '#16262a', active: '#17302a' },
        // Status pills: soft tint plus dark text, every pair is 5:1 or better.
        status: {
          success: { bg: '#d9fde8', fg: '#0b5431' },
          danger: { bg: '#fde8e6', fg: '#b42318' },
          warning: { bg: '#fdf0cc', fg: '#8a5300' },
          info: { bg: '#e0ecff', fg: '#1d4ed8' },
          neutral: { bg: '#eceef2', fg: '#434e62' },
        },
      },
      borderRadius: { card: '1rem' }, // 16px cards
      boxShadow: {
        card: '0 1px 2px rgba(15,18,24,.04), 0 2px 8px rgba(15,18,24,.05)',
        lift: '0 8px 24px rgba(15,18,24,.10), 0 2px 6px rgba(15,18,24,.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
