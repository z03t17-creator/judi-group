import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Tahoma", "Arial", "sans-serif"],
      },
      colors: {
        judi: {
          50: "#f0f7f4",
          100: "#dceee6",
          200: "#b7ddd0",
          300: "#86c4b3",
          400: "#56a592",
          500: "#3b8a79",
          600: "#2d6e62",
          700: "#275850",
          800: "#234742",
          900: "#1f3c38",
          950: "#0f2422",
        },
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        fg: {
          DEFAULT: "rgb(var(--fg) / <alpha-value>)",
          muted: "rgb(var(--fg-muted) / <alpha-value>)",
          subtle: "rgb(var(--fg-subtle) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          strong: "rgb(var(--line-strong) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          soft: "rgb(var(--success-soft) / <alpha-value>)",
          fg: "rgb(var(--success-fg) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          soft: "rgb(var(--warning-soft) / <alpha-value>)",
          fg: "rgb(var(--warning-fg) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          soft: "rgb(var(--danger-soft) / <alpha-value>)",
          fg: "rgb(var(--danger-fg) / <alpha-value>)",
        },
        info: {
          DEFAULT: "rgb(var(--info) / <alpha-value>)",
          soft: "rgb(var(--info-soft) / <alpha-value>)",
          fg: "rgb(var(--info-fg) / <alpha-value>)",
        },
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
      /** Content column: laptop/desktop centered; do not stretch forms edge-to-edge. */
      maxWidth: {
        content: "80rem", // 1280px
        "content-wide": "90rem", // 1440px ultrawide
      },
      /** Shared thumbnail box sizes (pair with `.thumb-*` in globals.css). */
      spacing: {
        "thumb-xs": "2rem", // 32px — desktop table column
        "thumb-sm": "3rem", // 48px — list row (phone default)
        "thumb-md": "4.5rem", // 72px — product / store card
        "thumb-lg": "7rem", // 112px — detail / profile hero
      },
    },
  },
  plugins: [],
  future: {
    // Phones: first tap clicks immediately (no sticky hover-then-click).
    hoverOnlyWhenSupported: true,
  },
};

export default config;
