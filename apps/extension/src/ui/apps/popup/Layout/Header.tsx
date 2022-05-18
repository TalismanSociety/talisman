import styled from "styled-components"
import { ReactComponent as Logo } from "@talisman/theme/logos/logo-hand-mono.svg"
import { ReactNode } from "react"
import { api } from "@ui/api"

type HeaderProps = {
  text?: ReactNode
  nav?: ReactNode
  className?: string
}

const Header = ({ text, nav, className }: HeaderProps) => {
  return (
    <header className={`${className} layout-header`}>
      <Logo className="logo" onClick={() => api.dashboardOpen("/")} />
      <span>{text}</span>
      <nav>{nav}</nav>
    </header>
  )
}

const StyledHeader = styled(Header)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 7.2rem;

  > svg {
    width: 3.2rem;
    height: 3.2rem;
    min-width: 3.2rem;
    display: block;
    cursor: pointer;
  }

  > span {
    font-size: var(--font-size-small);
    font-weight: bold;
  }

  > nav {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 3.2rem;
    > svg {
      width: 2.4rem;
      height: 2.4rem;
      & + svg {
        margin-left: 1.6rem;
      }
    }
  }
`

StyledHeader.displayName = "layout-header"

export default StyledHeader
