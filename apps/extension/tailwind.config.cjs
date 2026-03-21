/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts,tsx,svg,css}", "./public/*.html"],
  theme: {
    colors: {
      initial: "initial",
      inherit: "inherit",
      transparent: "transparent",
      current: "currentColor",
      white: "#fafafa", // rgb(250, 250, 250)
      black: {
        DEFAULT: "#121212", // rgb(18, 18, 18)
        primary: "#121212", // rgb(18, 18, 18)
        secondary: "#1B1B1B", // rgb(27, 27, 27)
        tertiary: "#262626", // rgb(38, 38, 38)
      },
      body: {
        disabled: "#5a5a5a", // rgb(90, 90, 90)
        inactive: "#717171", // rgb(113, 113, 113)
        secondary: "#a5a5a5", // rgb(165, 165, 165)
        DEFAULT: "#fafafa", // rgb(250, 250, 250)
        black: "#121212", // rgb(18, 18, 18)
      },
      field: "#1B1B1B", // rgb(27, 27, 27)
      pill: "#262626", // rgb(38, 38, 38 )
      alert: {
        success: "#6CFC69", // rgb(56, 212, 72)
        warn: "#f48f45", // rgb(244, 143, 69)
        error: "#fd4848", // rgb(210, 36, 36)
      },
      green: {
        DEFAULT: "#6CFC69", // rgb(56, 212, 72)
        500: "#6CFC69", // rgb(56, 212, 72)
      },
      orange: {
        DEFAULT: "#f48f45", // rgb(244, 143, 69)
        400: "#fb923c", // rgb(251, 146, 60)
        500: "#f48f45", // rgb(244, 143, 69)
      },
      red: {
        DEFAULT: "#fd4848", // rgb(210, 36, 36)
        400: "#f87171", // rgb(248, 113, 113)
        500: "#fd4848", // rgb(210, 36, 36)
      },
      primary: {
        DEFAULT: "#d5ff5c", // rgb(213, 255, 92)
        500: "#d5ff5c", // rgb(213, 255, 92)
        700: "#c8eb46", // rgb(200, 235, 70)
      },
      brand: {
        blue: "#005773", // rgb(0, 87, 115)
        pink: "#fd8fff", // rgb(253, 143, 255)
        orange: "#fd4848", // rgb(253, 72, 72)
      },
      grey: {
        50: "#fafafa", // rgb(250, 250, 250)
        100: "#f2f2f2", // rgb(242, 242, 242)
        200: "#e4e4e4", // rgb(228, 228, 228)
        300: "#d4d4d4", // rgb(212, 212, 212)
        400: "#a5a5a5", // rgb(165, 165, 165)
        500: "#717171", // rgb(113, 113, 113)
        600: "#5a5a5a", // rgb(90, 90, 90)
        700: "#3f3f3f", // rgb(63, 63, 63)
        750: "#2f2f2f", // rgb(47, 47, 47)
        800: "#262626", // rgb(38, 38, 38)
        850: "#1B1B1B", // rgb(27, 27, 27)
        900: "#181818", // rgb(24, 24, 24)
      },
      price: {
        up: "#8AEB94", // rgba(138, 235, 148, 1)
        down: "#FF5C5F", // rgba(255, 92, 92, 1)
      },
      buy: {
        DEFAULT: "#6CFC69", // rgb(56, 212, 72)
      },
      sell: {
        DEFAULT: "#FD4848", // rgb(210, 36, 36)
      },
    },
    lineHeight: {
      3: "0.375rem",
      4: "0.5rem",
      5: "0.625rem",
      6: "0.75rem",
      7: "0.875rem",
      8: "1rem",
      9: "1.125rem",
      10: "1.25rem",
      none: 1,
      base: 1.2,
      paragraph: 1.4,
    },
    fontSize: {
      "tiny": "0.625rem",
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "md": "1.125rem",
      "lg": "1.5rem",
      "xl": "2rem",
      "2xl": "2.25rem",
      "3xl": "2.5rem",
    },
    borderRadius: {
      "none": "0",
      "xs": "0.25rem",
      "sm": "0.5rem",
      "DEFAULT": "0.75rem",
      "lg": "1rem",
      "xl": "1.5rem",
      "2xl": "2rem",
      "3xl": "3rem",
      "full": "9999px",
    },
    spacing: {
      px: "1px",
      0: "0",
      0.5: "0.0625rem",
      1: "0.125rem",
      1.5: "0.1875rem",
      2: "0.25rem",
      2.5: "0.3125rem",
      3: "0.375rem",
      3.5: "0.4375rem",
      4: "0.5rem",
      5: "0.625rem",
      6: "0.75rem",
      7: "0.875rem",
      8: "1rem",
      9: "1.125rem",
      10: "1.25rem",
      11: "1.375rem",
      12: "1.5rem",
      14: "1.75rem",
      16: "2rem",
      20: "2.5rem",
      24: "3rem",
      28: "3.5rem",
      32: "4rem",
      36: "4.5rem",
      40: "5rem",
      44: "5.5rem",
      48: "6rem",
      52: "6.5rem",
      56: "7rem",
      60: "7.5rem",
      64: "8rem",
      72: "9rem",
      80: "10rem",
      96: "12rem",
    },
    extend: {
      fontFamily: {
        sans: 'Surt, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
        mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        surtExpanded:
          'SurtExpanded, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
        whyteInkTrap:
          'WhyteInktrapMedium, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
        inter:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
        unbounded:
          'Unbounded, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif',
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in-out": {
          "0%": { transform: "scale(0)" },
          "50%": { transform: "scale(1)" },
          "100%": { transform: "scale(0)" },
        },
        "slide-in-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0%)" },
        },
      },
      animation: {
        "fade-in-fast": "fade-in 0.1s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-in-slow": "fade-in 0.5s ease-out",
        "spin-slow": "spin 2s linear infinite",
        "spin-once": "spin 4s linear forwards",
        "scale-in-out-once": "scale-in-out 1.5s forwards",
        "slide-in-up": "slide-in-up 300ms ease-out",
      },
      gridTemplateColumns: {
        keyvalue: "auto 1fr",
      },
    },
  },
  variants: {
    extend: {
      visibility: ["group-hover"],
    },
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class",
    }),
    require("@tailwindcss/container-queries"),
  ],
}
