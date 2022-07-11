import { FC, ReactNode } from "react"
import styled from "styled-components"

import Link, { ILinkProps } from "./Link"

interface IButtonGroupProps {
  column?: boolean
  className?: string
  children?: ReactNode
}

const ButtonGroupComponent = ({ children, className }: IButtonGroupProps) => (
  <div className={`button-group ${className}`}>{children}</div>
)

export const ButtonGroup = styled(ButtonGroupComponent)`
  display: flex;
  align-items: flex-start;

  ${({ column }) =>
    !!column &&
    `
    flex-direction: column;
    >.link{
      display: flex
    }
  `};
`

const Button: FC<ILinkProps> = ({ className, ...props }) => (
  <Link className={`button ${className}`} {...props} />
)

export const StyledButton = styled(Button)`
  border: 1px solid var(--color-foreground);
  border-radius: 0.67em;
  padding: 0.723em 1em;
  display: flex;
  justify-content: center;

  &:hover {
    background: var(--color-foreground);
    color: var(--color-background);
  }

  // primary
  ${({ primary }) =>
    !!primary &&
    `
    background: var(--color-primary);
    color: var(--color-background);
    border: var(--color-primary);

    &:hover{
      filter: brightness(0.8);
      background: var(--color-primary);
      color: var(--color-background);
    }
  `}

  // inverted
  ${({ inverted }) =>
    !!inverted &&
    `
    background: var(--color-foreground);
    color: var(--color-background);
    border: none;
    padding: calc(0.723em + 1px) calc(1em + 1px);
  `}

  // inverted
  ${({ disabled }) =>
    !!disabled &&
    `
    filter: saturate(50%);
    opacity: 0.3;

    &:hover{
        filter: saturate(50%);
        opacity: 0.3;
    }
  `}
`

export default StyledButton
