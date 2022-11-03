import Button from "@talisman/components/Button"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { ReactNode, useCallback } from "react"
import { To, useNavigate } from "react-router-dom"
import styled from "styled-components"

import { ILinkProps } from "./Link"

const StyledButton = styled(Button)`
  background: var(--color-background-muted);
  border: none;
  color: var(--color-mid);
  padding: 0.3em;
  display: inline-flex;
  transition: none;
  width: auto;
  svg {
    margin: 0;
  }
  &:hover {
    color: var(--color-foreground-muted-2x);
    background: var(--color-background-muted);
  }
`

type BackButtonProps = ILinkProps & {
  children?: ReactNode
  analytics?: AnalyticsPage
}

export const BackButton = ({ analytics, children, to, ...props }: BackButtonProps) => {
  const navigate = useNavigate()
  const handleBackClick = useCallback(() => {
    if (analytics) {
      sendAnalyticsEvent({
        ...analytics,
        name: "Goto",
        action: "Back",
      })
    }
    navigate(to ?? (-1 as To))
  }, [analytics, navigate, to])

  return (
    <StyledButton small onClick={handleBackClick} {...props}>
      <ChevronLeftIcon />
      <span>{children ?? "Back"}</span>
    </StyledButton>
  )
}
