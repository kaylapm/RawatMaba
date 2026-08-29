/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gsm-blue-main': '#003CEC',
        'gsm-cyan': '#00B0D8',
        'gsm-lavender': '#C896E0',
        'gsm-peach': '#E59B86',
        'gsm-cream': '#F4F6C0',
        'gsm-lilac': '#DCD6F7',
        'gsm-dark-blue': '#0A1128',
      },
      fontFamily: {
        'sans': ['Plus Jakarta Sans', 'sans-serif'],
        'coolvetica': ['Manrope', 'Plus Jakarta Sans', 'sans-serif'],
        'serif-judul': ['Manrope', 'Plus Jakarta Sans', 'sans-serif'],
        'isi': ['Plus Jakarta Sans', 'sans-serif'],
        'reddit': ['Plus Jakarta Sans', 'sans-serif'],
        'sans-code': ['Plus Jakarta Sans', 'sans-serif'],
      },
      fontWeight: {
        'semibold': '600',
        'bold': '600',
        'extrabold': '700',
      },
      backgroundImage: {
        'gsm-blue-gradient': 'linear-gradient(135deg, #003CEC 0%, #00B0D8 62%)',
        'gsm-blue-linear': 'linear-gradient(180deg, #003CEC 0%, #00B0D8 62%)',
        'gsm-peach-gradient': 'linear-gradient(180deg, #E59B86 0%, #C896E0 50%, #F4F6C0 100%)',
      },
      boxShadow: {
        'gsm-card': '0 10px 30px -5px rgba(0, 60, 236, 0.08)',
        'gsm-hover': '0 20px 40px -10px rgba(0, 60, 236, 0.18)',
      }
    },
  },
  plugins: [],
}
