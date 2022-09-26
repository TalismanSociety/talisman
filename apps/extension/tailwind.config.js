/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts,tsx,svg}", "./public/*.html"], // can't get it to work for html files in public folder
  theme: {
    colors: {
      white: "#fafafa", // rgb(250, 250, 250)
      black: "#000000", // rgb(0, 0, 0)
      body: {
        disabled: "#5a5a5a", // rgb(90, 90, 90)
        secondary: "#a5a5a5", // rgb(165, 165, 165)
        DEFAULT: "#fafafa", // rgb(250, 250, 250)
        black: "#121212", // rgb(18, 18, 18)
      },
      field: "#1B1B1B", // rgb(27, 27, 27)
      pill: "#262626", // rgb(38, 38, 38 )
      alert: {
        success: "#38d448", // rgb(56, 212, 72)
        warn: "#f48f45", // rgb(244, 143, 69)
        error: "#d22424", // rgb(210, 36, 36)
      },
      green: "#d5ff5c", // rgb(213, 255, 92)
      blue: "#005773", // rgb(0, 87, 115)
      pink: "#fd8fff", // rgb(253, 143, 255)
      orange: "#fd4848", // rgb(253, 72, 72)
    },
    extend: {
      lineHeight: {
        base: 1.2,
      },
    },
  },
  plugins: [],
}
