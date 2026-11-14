import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
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
      },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)' },
    },
  },
  plugins: [],
} satisfies Config;
