/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'deathPulse': 'deathPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        deathPulse: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.85, transform: 'scale(0.97)' },
        }
      }
    },
  },
  plugins: [],
}
