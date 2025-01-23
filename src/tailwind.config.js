/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Add typography support for markdown
  safelist: [
    'prose',
    'prose-invert',
    'prose-sm',
  ]
}
