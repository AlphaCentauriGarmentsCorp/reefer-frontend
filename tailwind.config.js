/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        reefer: {
          orange: '#FF6B35',
          black: '#0A0A0A',
          darkgray: '#1A1A1A',
        },
      },
    },
  },
  plugins: [],
};
