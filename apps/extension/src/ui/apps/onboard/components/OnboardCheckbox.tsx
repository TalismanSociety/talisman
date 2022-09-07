// @ts-nocheck
import { Checkbox } from "@talisman/components/Checkbox"
import styled from "styled-components"

import { styleOnboardTranslucidBackground } from "./OnboardStyles"

export const OnboardCheckbox = styled(Checkbox)`
  .square {
    ${styleOnboardTranslucidBackground}
  }

  input:enabled:focus + span span {
    border-color: rgba(var(--color-foreground-raw), 0.4);
  }
  input:enabled:active + span span {
    border-color: rgba(var(--color-foreground-raw), 0.6);
  }
`
