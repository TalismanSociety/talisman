import Button from "@talisman/components/Button"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { FC, useCallback } from "react"
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

export const BackButton: FC<ILinkProps> = ({ children, to, ...props }) => {
  const navigate = useNavigate()
  const handleBackClick = useCallback(() => navigate(to ?? (-1 as To)), [navigate, to])

  return (
    <StyledButton small onClick={handleBackClick} {...props}>
      <ChevronLeftIcon />
      <span>{children ?? "Back"}</span>
    </StyledButton>
  )
}
