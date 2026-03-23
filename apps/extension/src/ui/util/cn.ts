import { extendTailwindMerge } from "tailwind-merge"

// Tailwind v4 custom token from app styles.css:
// --text-tiny generates `text-tiny` (font-size), but tailwind-merge treats unknown `text-*`
// as text-color by default. Extend class groups so `text-tiny` behaves like font-size.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["tiny"] }],
    },
  },
})

export const classNames = twMerge

export const cn = twMerge
