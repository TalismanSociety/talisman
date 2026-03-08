/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts,tsx,svg,css}", "./public/*.html"],
  theme: {
    colors: {
      initial: "initial",
      inherit: "inherit",
      transparent: "transparent",
      current: "currentColor",
      white: "#fafafa",
      black: {
        DEFAULT: "#121212",
        primary: "#121212",
        secondary: "#1B1B1B",
        tertiary: "#262626",
      },
      body: {
        disabled: "#5a5a5a",
        inactive: "#717171",
        secondary: "#a5a5a5",
        DEFAULT: "#fafafa",
        black: "#121212",
      },
      field: "#1B1B1B",
      alert: {
        success: "#6CFC69",
        warn: "#f48f45",
        error: "#fd4848",
      },
      orange: {
        DEFAULT: "#f48f45",
        500: "#f48f45",
      },
      primary: {
        DEFAULT: "#d5ff5c",
        500: "#d5ff5c",
      },
      brand: {
        blue: "#005773",
        pink: "#fd8fff",
        orange: "#fd4848",
      },
      grey: {
        400: "#a5a5a5",
        500: "#717171",
        600: "#5a5a5a",
        700: "#3f3f3f",
        800: "#262626",
      },
    },
    fontSize: {
      "tiny": "1.0rem",
      "xs": "1.2rem",
      "sm": "1.4rem",
      "base": "1.6rem",
      "md": "1.8rem",
      "lg": "2.4rem",
      "xl": "3.2rem",
    },
    lineHeight: {
      none: 1,
      base: 1.2,
      paragraph: 1.4,
    },
    borderRadius: {
      "none": "0",
      "xs": "0.4rem",
      "sm": "0.8rem",
      "DEFAULT": "1.2rem",
      "full": "9999px",
    },
    spacing: {
      px: "1px",
      0: "0",
      1: "0.2rem",
      2: "0.4rem",
      3: "0.6rem",
      4: "0.8rem",
      5: "1rem",
      6: "1.2rem",
      8: "1.6rem",
      10: "2rem",
      12: "2.4rem",
      16: "3.2rem",
      20: "4rem",
    },
    extend: {
      fontFamily: {
        sans: 'Surt, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      },
    },
  },
}
