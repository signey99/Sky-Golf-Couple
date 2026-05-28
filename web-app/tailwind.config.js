module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        golf: {
          50: '#f0faf3',
          100: '#dbf4e5',
          200: '#bae8cb',
          300: '#89d7a6',
          400: '#52bd7a',
          50: '#107c41', // Emerald Golf Green
          600: '#156b3b',
          700: '#115531',
          800: '#104429',
          900: '#0e3923',
          950: '#041f11',
        }
      }
    },
  },
  plugins: [],
}
