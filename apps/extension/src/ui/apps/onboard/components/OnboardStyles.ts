import { css } from "styled-components"

export const styleOnboardTranslucidBackground = css`
  backface-visibility: hidden;
  perspective: 1000;
  background: rgba(var(--color-foreground-raw), 0.05);
  backdrop-filter: blur(9.6rem);
  transform: translate3d(0, 0, 0); // prevents flickering (enables GPU rendering)
  transform: translateZ(0);
`
