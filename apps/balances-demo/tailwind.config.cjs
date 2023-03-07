/* eslint-env es2021 */
const TALISMAN_TAILWIND_CONFIG = require("talisman-ui/tailwind.config.cjs")

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...TALISMAN_TAILWIND_CONFIG,
  content: [
    "./**/*.{html,ts,tsx,svg}",
    "./public/*.html",
    "../../packages/talisman-ui/**/*.{html,ts,tsx,svg,css}",
  ],
}
