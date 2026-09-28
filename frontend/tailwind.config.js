/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Courier Prime"', 'ui-monospace', 'monospace'],
        cond: ['"Archivo Narrow"', 'system-ui', 'sans-serif'],
        mono: ['"Courier Prime"', 'ui-monospace', 'monospace'],
        matrixtype: ['Matrixtype', '"Courier Prime"', 'monospace'],
        'matrixtype-display': ['"Matrixtype Display"', 'Matrixtype', '"Courier Prime"', 'monospace'],
      },
      colors: {
        kraft: { DEFAULT: '#c3a273', deep: '#a9895c', dark: '#8e7048' },
        pulp: { DEFAULT: '#f2ece1', 2: '#e8e0d2' },
        'paper-grey': '#d6ccbc',
        ink: { DEFAULT: '#2a2724', 2: '#4a443d', kraft: '#3a342d' },
        ash: '#6b645b',
        rule: 'rgba(42, 39, 36, 0.16)',
        crimson: { DEFAULT: '#b3262d', deep: '#8f1d23' },
        forest: '#3f6a3a',
        ochre: '#8a5f12',
        rust: '#a2451c',
        plate: { DEFAULT: '#2a2724', 2: '#35312d', ink: '#ede6d8', dim: '#b5ab9b' },
      },
      boxShadow: {
        'lift-1': 'var(--lift-1)',
        'lift-2': 'var(--lift-2)',
        'lift-3': 'var(--lift-3)',
      },
      borderRadius: {
        paper: '3px',
      },
    },
  },
  plugins: [],
}
