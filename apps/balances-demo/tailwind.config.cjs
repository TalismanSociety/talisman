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
      "tiny": "0.625rem",
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "md": "1.125rem",
      "lg": "1.5rem",
      "xl": "2rem",
    },
    lineHeight: {
      none: 1,
      base: 1.2,
      paragraph: 1.4,
    },
    borderRadius: {
      "none": "0",
      "xs": "0.25rem",
      "sm": "0.5rem",
      "DEFAULT": "0.75rem",
      "full": "9999px",
    },
    spacing: {
      px: "1px",
      0: "0",
      1: "0.125rem",
      2: "0.25rem",
      3: "0.375rem",
      4: "0.5rem",
      5: "0.625rem",
      6: "0.75rem",
      8: "1rem",
      10: "1.25rem",
      12: "1.5rem",
      16: "2rem",
      20: "2.5rem",
    },
    extend: {
      fontFamily: {
        sans: 'Surt, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      },
    },
  },
}
