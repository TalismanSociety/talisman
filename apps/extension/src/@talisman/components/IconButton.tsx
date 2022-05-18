import { classNames } from "@talisman/util/classNames"
import { ButtonHTMLAttributes, FC } from "react"
import styled from "styled-components"

const Button = styled.button`
  display: inline-block;
  width: 2.4rem;
  height: 2.4rem;
  font-size: var(--font-size-large);
  padding: 0;
  background: transparent;
  outline: none;
  border: none;
  cursor: pointer;
  box-sizing: border-box;
  color: var(--color-mid);
  transition: color var(--transition-speed-fast) ease-in;

  &:hover {
    opacity: 1;
    color: var(--color-muted);
  }
`

export const IconButton: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  type = "button",
  className,
  ...rest
}) => (
  <Button className={classNames("icon-button", className)} type={type} {...rest}>
    {children}
  </Button>
)
