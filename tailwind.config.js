/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./node_modules/@nasa-jpl/stellar-react/dist/**/*.{html,js,tsx,ts}",
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  presets: [require("@nasa-jpl/stellar-react/tailwindConfig")],
};
