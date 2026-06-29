import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Heebo", "Assistant", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#ea580c", // כתום — שביל התפוזים
          dark: "#c2410c",
          light: "#fed7aa",
        },
      },
    },
  },
  plugins: [],
};

export default config;
