// @ts-nocheck
import { Checkbox } from "@talisman/components/Checkbox"
import styled from "styled-components"

export const OnboardCheckbox = styled(Checkbox)`
  .square {
    background: rgba(var(--color-foreground-raw), 0.05);
    backdrop-filter: blur(4.8rem);
  }

  input:enabled:focus + span span {
    border-color: rgba(var(--color-foreground-raw), 0.4);
  }
  input:enabled:active + span span {
    border-color: rgba(var(--color-foreground-raw), 0.6);
  }
`
