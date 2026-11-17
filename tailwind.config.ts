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
        page: ['1.75rem', { lineHeight: '2.25rem', fontWeight: '700' }], // 28px page titles
        section: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }], // 20px section and card titles
        body: ['0.9375rem', { lineHeight: '1.5rem' }], // 15px
        cell: ['0.875rem', { lineHeight: '1.25rem' }], // 14px table cells
        label: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.03em' }], // 12px, used uppercase
        stat: ['2rem', { lineHeight: '2.25rem', fontWeight: '700' }], // 32px stat numbers
      },
      colors: {
        // Lime brand. 500 is the brand colour, 600 its hover, 700 the deep green for links, icons and focus rings.
        volt: {
          50: '#f1f7e7', // table headers
          100: '#e4f2cf', // chips, active items
          200: '#d3e8b3',
          300: '#b9db8a',
          400: '#9fd05f',
          500: '#84c441',
          600: '#73b034',
          700: '#3f7d1a',
          800: '#35661a',
          900: '#2a4f15',
          950: '#0e1a0b',
        },
        // Green-tinted neutrals. 900 headings, 700 body, 600 muted, 200 borders.
        ink: {
          50: '#f7faf3',
          100: '#eef3e7',
          200: '#e3ebd8',
          300: '#cfdac3',
          400: '#9aa98f',
          500: '#6b7b62',
          600: '#4b5a43',
          700: '#3a4a32',
          800: '#26331f',
          900: '#0e1a0b',
          950: '#0a1307',
        },
        canvas: '#f7faf3', // page background
        line: '#e3ebd8', // 1px borders
        accent: '#5fa21f', // 3px active bar in the sidebar
        // Status pills: soft tint plus dark text, every pair is 5:1 or better.
        status: {
          success: { bg: '#e4f2cf', fg: '#2a5a10' },
          danger: { bg: '#fde8e6', fg: '#b42318' },
          warning: { bg: '#fdf0cc', fg: '#8a5300' },
          info: { bg: '#e0ecff', fg: '#1d4ed8' },
          neutral: { bg: '#eef3e7', fg: '#3a4a32' },
        },
      },
      borderRadius: { card: '1rem' }, // 16px cards
      boxShadow: {
        card: '0 1px 2px rgba(14,26,11,.04), 0 2px 8px rgba(14,26,11,.05)',
        lift: '0 8px 24px rgba(14,26,11,.10), 0 2px 6px rgba(14,26,11,.06)',
      },
    },
  },
  plugins: [],
} satisfies Config;
