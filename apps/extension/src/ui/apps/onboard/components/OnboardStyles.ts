import { css } from "styled-components"

export const styleOnboardTranslucidBackground = css`
  background: rgba(var(--color-foreground-raw), 0.05);
  backdrop-filter: blur(9.6rem);
  transform: translate3d(0, 0, 0); // prevents flickering (enables GPU rendering)
`
