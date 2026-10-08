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
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        canvas: 'var(--background)',
        surface: 'var(--site-surface)',
        soft: 'var(--site-soft)',
        line: 'var(--site-line)',
        ink: 'var(--foreground)',
        muted: 'var(--site-muted)',
        brand: 'var(--site-accent)',
        'brand-strong': 'var(--site-accent-strong)',
        'brand-soft': 'var(--site-accent-soft)',
      },
    },
  },
  plugins: [],
}
