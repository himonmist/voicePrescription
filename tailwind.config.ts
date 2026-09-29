import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { navy: { 900: "#0b1b3b", 700: "#1b2f5c", 500: "#3a5187" }, brand: { teal: "#0f9d9a", violet: "#6d4aff", soft: "#f5f7fb" } },
    boxShadow: { card: "0 1px 2px rgba(11,27,59,.06), 0 8px 24px rgba(11,27,59,.06)" } } },
} satisfies Config;
