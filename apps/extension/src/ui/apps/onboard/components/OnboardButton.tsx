import { SimpleButton } from "@talisman/components/SimpleButton"
import styled from "styled-components"

export const OnboardButton = styled(SimpleButton)`
  :disabled {
    background: rgba(var(--color-foreground-raw), 0.05);
    backdrop-filter: blur(4.8rem);
    color: var(--color-mid);
  }
  width: 100%;
`
