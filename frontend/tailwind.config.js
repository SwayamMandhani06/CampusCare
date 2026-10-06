/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
        },
        subtle: "var(--subtle)",
        muted: "var(--muted)",
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          light: "var(--brand-light)",
          contrast: "var(--brand-contrast)",
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
        sans: ['"Plus Jakarta Sans"', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Geist Mono"', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
