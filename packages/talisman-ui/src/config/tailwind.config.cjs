/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts,tsx,svg}"],
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
      green: {
        200: "#cdf4d1", // rgb(205, 244, 209)
        DEFAULT: "#38d448", // rgb(56, 212, 72)
        500: "#38d448", // rgb(56, 212, 72)
      },
      orange: {
        200: "#ecdcb1", // rgb(236, 220, 177)
        DEFAULT: "#f48f45", // rgb(244, 143, 69)
        500: "#f48f45", // rgb(244, 143, 69)
      },
      red: {
        200: "#e0b5b5", // rgb(224, 181, 181)
        DEFAULT: "#d22424", // rgb(210, 36, 36)
        500: "#d22424", // rgb(210, 36, 36)
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
      paragraph: 1.4,
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
    spacing: {
      px: "1px",
      0: "0",
      0.5: "0.1rem",
      1: "0.2rem",
      1.5: "0.3rem",
      2: "0.4rem",
      2.5: "0.5rem",
      3: "0.6rem",
      3.5: "0.7rem",
      4: "0.8rem",
      5: "1rem",
      6: "1.2rem",
      7: "1.4rem",
      8: "1.6rem",
      9: "1.8rem",
      10: "2rem",
      11: "2.2rem",
      12: "2.4rem",
      14: "2.8rem",
      16: "3.2rem",
      20: "4rem",
      24: "4.8rem",
      28: "5.6rem",
      32: "6.4rem",
      36: "7.2rem",
      40: "8rem",
      44: "8.8rem",
      48: "9.6rem",
      52: "10.4rem",
      56: "11.2rem",
      60: "12rem",
      64: "12.8rem",
      72: "14.4rem",
      80: "16rem",
      96: "19.2rem",
    },
    extend: {
      fontFamily: {
        // recommended way of overriding default font
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
      },
      animation: {
        "fade-in-fast": "fade-in 0.1s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-in-slow": "fade-in 0.5s ease-out",
        "spin-slow": "spin 2s linear infinite",
        "spin-once": "spin 4s linear forwards",
        "scale-in-out-once": "scale-in-out 1.5s forwards",
      },
      gridTemplateColumns: {
        // 2 columns, 2nd grows
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
    require('@tailwindcss/container-queries'),
  ],
}
