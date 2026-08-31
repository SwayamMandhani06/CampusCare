/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        muted: "var(--muted)",
        line: "var(--line)",
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
        },
        // Semantic status tokens
        status: {
          pending: "var(--status-pending)",
          reviewed: "var(--status-reviewed)",
          assigned: "var(--status-assigned)",
          progress: "var(--status-progress)",
          resolved: "var(--status-resolved)",
        },
        // Semantic priority tokens
        priority: {
          low: "var(--priority-low)",
          medium: "var(--priority-medium)",
          high: "var(--priority-high)",
          critical: "var(--priority-critical)",
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
