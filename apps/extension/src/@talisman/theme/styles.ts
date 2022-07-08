import { css } from "styled-components"

export const scrollbarsStyle = (color = "var(--color-background-muted-3x)") => css`
  ::-webkit-scrollbar {
    background-color: transparent;
  }
  ::-webkit-scrollbar-thumb {
    box-shadow: inset 0 0 10px 10px ${color};
    border: solid 3px transparent;
    border-radius: 25px;
  }

  scrollbar-color: ${color} transparent;
`
export const hideScrollbarsStyle = css`
  ::-webkit-scrollbar {
    background-color: transparent;
    width: 0;
  }

  scrollbar-color: transparent transparent;
`
