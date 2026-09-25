import { extendTailwindMerge } from "cn/config"

// Tailwind v4 custom token from app styles.css:
// --text-tiny generates `text-tiny` (font-size), but the merger treats unknown `text-*`
// as text-color by default. Extend class groups so `text-tiny` behaves like font-size.
export const cn = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["tiny"] }],
    },
  },
})
