/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          50: 'color-mix(in srgb, var(--accent) 8%, transparent)',
          100: 'color-mix(in srgb, var(--accent) 14%, transparent)',
          200: 'color-mix(in srgb, var(--accent) 22%, transparent)',
          500: 'var(--accent)',
          600: 'color-mix(in srgb, var(--accent) 85%, black)',
          700: 'color-mix(in srgb, var(--accent) 70%, black)',
        },
        chat: {
          bg: '#efeae2',
          panel: '#f0f2f5',
          bubble: '#ffffff',
          bubbleOut: 'var(--accent)',
          bubbleOutText: '#ffffff',
          bubbleText: '#111b21',
          muted: '#667781',
          border: '#e9edef',
          dark: {
            bg: '#0b141a',
            panel: '#111b21',
            bubble: '#202c33',
            bubbleText: '#e9edef',
            border: '#222e35',
            input: '#1f2c34',
          },
        },
        success: '#00a884',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        lift: '0 4px 16px rgba(0,0,0,0.10)',
        glow: '0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '60%': { opacity: '1', transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'slide-right': 'slide-right 0.2s ease-out',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.3s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};
