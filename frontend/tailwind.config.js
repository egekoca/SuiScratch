/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fall': 'fall 3s linear infinite',
        'shimmer': 'shimmer 1s infinite',
        'pop-in': 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        fall: {
          '0%': { transform: 'translateY(-20%) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(120vh) rotate(360deg)', opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-150%) skewX(-12deg)' },
          '100%': { transform: 'translateX(150%) skewX(-12deg)' },
        },
        popIn: {
          'from': { opacity: '0', transform: 'scale(0.5) translateY(20px)' },
          'to': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

