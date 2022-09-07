import { SimpleButton } from "@talisman/components/SimpleButton"
import styled from "styled-components"

import { styleOnboardTranslucidBackground } from "./OnboardStyles"

export const OnboardButton = styled(SimpleButton)`
  :disabled {
    ${styleOnboardTranslucidBackground}
    color: var(--color-mid);
  }
  width: 100%;
`
