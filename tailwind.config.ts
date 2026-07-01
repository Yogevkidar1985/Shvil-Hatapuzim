import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Heebo", "Assistant", "system-ui", "sans-serif"],
      },
      colors: {
        // ירוק מקרקעין — צבע המותג
        brand: {
          50: "#eaf3ef",
          100: "#cfe6da",
          200: "#a1cdba",
          300: "#6cae94",
          400: "#3d9070",
          500: "#1f785b",
          600: "#146149",
          700: "#0f4d3a",
          800: "#0c3b2d",
          900: "#08281f",
          DEFAULT: "#146149",
        },
        // זהב — צבע משני
        gold: {
          50: "#faf5e9",
          100: "#f2e6c8",
          200: "#e6d1a0",
          300: "#d8b35f",
          400: "#cba85a",
          500: "#b8924f",
          600: "#9c7a3c",
          700: "#7d6130",
          DEFAULT: "#b8924f",
        },
      },
      boxShadow: {
        brand: "0 8px 24px rgba(12, 59, 45, 0.28)",
        gold: "0 8px 24px rgba(184, 146, 79, 0.28)",
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        card: "0 4px 12px rgba(15,23,42,0.08)",
        pop: "0 12px 40px rgba(15,23,42,0.14)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};

export default config;
