/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        brand: {
          DEFAULT:          "hsl(var(--brand) / <alpha-value>)",
          hover:            "hsl(var(--brand-hover) / <alpha-value>)",
          light:            "hsl(var(--brand-light) / <alpha-value>)",
          subtle:           "hsl(var(--brand-subtle) / <alpha-value>)",
          text:             "hsl(var(--brand-text) / <alpha-value>)",
          dark:             "hsl(var(--brand-dark) / <alpha-value>)",
          border:           "hsl(var(--brand-border) / <alpha-value>)",
          "border-strong":  "hsl(var(--brand-border-strong) / <alpha-value>)",
          fg:               "hsl(var(--brand-fg) / <alpha-value>)",
          "on-dark":        "hsl(var(--brand-on-dark) / <alpha-value>)",
        },
        tag: {
          DEFAULT:     "hsl(var(--tag) / <alpha-value>)",
          border:      "hsl(var(--tag-border) / <alpha-value>)",
          text:        "hsl(var(--tag-text) / <alpha-value>)",
          dark:        "hsl(var(--tag-dark) / <alpha-value>)",
          "text-dark": "hsl(var(--tag-text-dark) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
}
