/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("../../packages/ui/tailwind.config.js")],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
}
