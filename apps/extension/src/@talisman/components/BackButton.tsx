import styled from "styled-components"
import Button from "@talisman/components/Button"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { useNavigate } from "react-router-dom"
import { FC, useCallback } from "react"
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

export const BackButton: FC<ILinkProps> = ({ children, ...props }) => {
  const navigate = useNavigate()
  const handleBackClick = useCallback(() => navigate(-1), [navigate])

  return (
    <StyledButton small onClick={handleBackClick} {...props}>
      <ChevronLeftIcon />
      <span>{children ?? "Back"}</span>
    </StyledButton>
  )
}
