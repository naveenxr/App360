import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        catalyst: {
          blue: "#2563EB",
          blueHover: "#1D4ED8",
          blueLight: "#EFF6FF",
          navy: "#142B50",
          navyDark: "#0B1930",
          navyLight: "#1D3B68",
          text: "#172B4D",
          textLight: "#42526E",
          muted: "#64748B",
          bg: "#F7F9FC",
          surface: "#FFFFFF",
          border: "#E5EAF1",
          borderHover: "#CBD5E1",
          success: "#16A36A",
          successLight: "#ECFDF5",
          warning: "#D99A21",
          warningLight: "#FFFBEB",
          danger: "#DC4545",
          dangerLight: "#FEF2F2",
          info: "#3985D8",
          infoLight: "#F0F9FF",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
        cardHover: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)",
        dropdown: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
