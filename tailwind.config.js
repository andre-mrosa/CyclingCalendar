/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--background)',
        surface: 'var(--site-surface)',
        soft: 'var(--site-soft)',
        line: 'var(--site-line)',
        ink: 'var(--foreground)',
        muted: 'var(--site-muted)',
        brand: 'var(--site-accent)',
        'brand-soft': 'var(--site-accent-soft)',
      },
    },
  },
  plugins: [],
}
