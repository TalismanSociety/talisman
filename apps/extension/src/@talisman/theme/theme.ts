import { DefaultTheme } from "styled-components"

/* theming options */
// declare all theme based colors in rgb
// when using in component, need to wrap in rgb(...) declaration
// can also use rgba to define opacity

declare module "styled-components" {
  export interface DefaultTheme {
    "primary": string
    "secondary": string
    "background": string
    "background-muted": string
    "background-muted-2x": string
    "background-muted-3x": string
    "foreground": string
    "foreground-muted": string
    "foreground-muted-2x": string
    "mid": string
  }
}

const light: DefaultTheme = {
  "primary": "213, 255, 92",
  "secondary": "0, 0, 255",
  "background": "250, 250, 250",
  "background-muted": "240, 240, 240",
  "background-muted-2x": "210, 210, 210",
  "background-muted-3x": "190, 190, 190",
  "foreground": "18, 18, 18",
  "foreground-muted": "38, 38, 38",
  "foreground-muted-2x": "90, 90, 90",
  "mid": "165, 165, 165",
}

const dark: DefaultTheme = {
  "primary": "213, 255, 92",
  "secondary": "0, 0, 255",
  "background": "18, 18, 18",
  "background-muted": "27,27,27",
  "background-muted-2x": "90, 90, 90",
  "background-muted-3x": "38, 38, 38",
  "foreground": "250, 250, 250",
  "foreground-muted": "240, 240, 240",
  "foreground-muted-2x": "210, 210, 210",
  "mid": "165, 165, 165",
}

const theme = {
  light,
  dark,
}

export default theme
