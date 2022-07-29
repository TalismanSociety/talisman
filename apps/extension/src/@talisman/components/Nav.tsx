import { classNames } from "@talisman/util/classNames"
import { HTMLAttributes, ReactNode, useCallback } from "react"
import { NavLink, NavLinkProps } from "react-router-dom"
import styled, { css } from "styled-components"

const NAV_ITEM_STYLE = css`
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  border: none;
  color: var(--color-foreground);
  background: transparent;
  padding: 1em 0.4em;
  line-height: 1.6em;
  cursor: pointer;
  transition: all var(--transition-speed) ease-in-out;
  text-align: center;
  position: relative;
  overflow: hidden;

  > * {
    transition: all var(--transition-speed-fast) ease-in;
    margin: 0 0.4em;

    &.icon {
      margin-bottom: 0.05em;
      font-size: 1.5em;
      svg {
        display: block;
      }
    }
  }

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

type NavItemCommonProps = {
  icon?: ReactNode
  children?: ReactNode
  className?: string
}

type NavItemButtonProps = HTMLAttributes<HTMLButtonElement> & NavItemCommonProps

export const NavItemButton = styled(
  ({ icon, className, children, ...props }: NavItemButtonProps) => {
    return (
      <button type="button" className={classNames("link", className)} {...props}>
        <>
          {icon && <span className="icon">{icon}</span>}
          <span>{children}</span>
        </>
      </button>
    )
  }
)`
  ${NAV_ITEM_STYLE}
`

type NavItemProps = NavLinkProps & NavItemButtonProps

export const NavItemLink = styled(({ icon, className, children, ...props }: NavItemProps) => {
  return (
    <NavLink className={classNames("link", className)} {...props}>
      <>
        {icon && <span className="icon">{icon}</span>}
        <span>{children}</span>
      </>
    </NavLink>
  )
})`
  ${NAV_ITEM_STYLE}
`

interface NavProps {
  column?: boolean
  children?: any
  className?: string
}

const Nav = ({ children, className }: NavProps) => (
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

export default StyledNav
