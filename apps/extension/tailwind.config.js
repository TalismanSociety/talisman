/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts,tsx,svg}", "./public/*.html"], // can't get it to work for html files in public folder
  theme: {
    colors: {
      current: "currentColor",
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
    lineHeight: {
      3: "0.6rem",
      4: "0.8rem",
      5: "1rem",
      6: "1.2rem",
      7: "1.4rem",
      8: "1.6rem",
      9: "1.8rem",
      10: "2rem",
      none: 1,
      base: 1.2,
    },
    fontSize: {
      "tiny": "1.0rem",
      "xs": "1.2rem",
      "sm": "1.4rem",
      "base": "1.6rem",
      "md": "1.8rem",
      "lg": "2.4rem",
      "xl": "3.2rem",
      "2xl": "3.6rem",
      "3xl": "4rem",
    },
    borderRadius: {
      "none": "0",
      "xs": "0.4rem",
      "sm": "0.8rem",
      "DEFAULT": "1.2rem",
      "lg": "1.6rem",
      "xl": "2.4rem",
      "2xl": "3.2rem",
      "3xl": "4.8rem",
      "full": "9999px",
    },
    extend: {
      fontFamily: {
        // recommended way of overriding default font
        sans: 'Surt, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
        mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        whyteInkTrap:
          'WhyteInktrapMedium, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
      },
    },
  },
  plugins: [],
}
