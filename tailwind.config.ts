import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f8fb",
          100: "#e8eef7",
          200: "#d1dceb",
          300: "#a6bad6",
          400: "#6f8ebc",
          500: "#47689a",
          600: "#355078",
          700: "#293f5f",
          800: "#22344d",
          900: "#1d2c41",
        },
        accent: {
          50: "#f8fbf4",
          100: "#edf5e4",
          200: "#d8e8c4",
          300: "#bbd59a",
          400: "#94b866",
          500: "#6f9840",
          600: "#567932",
          700: "#435e29",
          800: "#384c25",
          900: "#304020",
        },
      },
      boxShadow: {
        panel: "0 12px 32px rgba(26, 40, 61, 0.08)",
        focus: "0 0 0 4px rgba(71, 104, 154, 0.14)",
      },
      fontFamily: {
        sans: ["'Noto Sans SC'", "'PingFang SC'", "'Microsoft YaHei'", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
