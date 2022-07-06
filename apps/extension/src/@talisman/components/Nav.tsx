import styled from "styled-components"

import Link from "./Link"

interface IProps {
  column?: boolean
  children?: any
  className?: string
}

const Nav = ({ children, className }: IProps) => (
  <nav className={`nav ${className}`}>{children}</nav>
)

const StyledNav = styled(Nav)`
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

export const NavItem = styled(Link)`
  > * {
    opacity: 0.6;
  }

  &.active {
    opacity: 1;

    > * {
      opacity: 1;
    }
  }

  &:hover {
    > * {
      opacity: 1;
    }
  }
`

export default StyledNav
