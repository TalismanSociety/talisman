import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import { FC, ReactNode } from "react"
import styled from "styled-components"

import { BottomNav } from "../components/Navigation/BottomNav"
import { NavigationDrawer } from "../components/Navigation/NavigationDrawer"

type LayoutProps = {
  children: ReactNode
  className?: string
  withBottomNav?: boolean
  isThinking?: boolean
}

const Layout: FC<LayoutProps> = ({ className, withBottomNav, children }) => {
  return (
    <main id="main" className={className}>
      <ErrorBoundary>
        {children}
        {withBottomNav && (
          <>
            <BottomNav />
            <NavigationDrawer />
          </>
        )}
      </ErrorBoundary>
    </main>
  )
}

const StyledLayout = styled(Layout)`
  margin: 0 auto;
  width: 40rem;
  height: 60rem;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;

  > header,
  > section,
  > footer {
    transition: all var(--transition-speed-slow) ease-in-out;
  }

  > header {
    padding: 2rem 2.4rem;

    & + section {
      margin-top: 0;
    }
  }

  > section {
    flex-grow: 1;
    padding: 0;

    > .children {
      padding: 0 2.4rem;
    }
  }

  > footer {
    padding: 2rem 2.4rem;

    > .button {
      width: 100%;
      display: block;
    }
  }

  ${({ isThinking }) =>
    !!isThinking &&
    `
    > header,
    > footer{
       opacity: 0;
    }
  `}
`

export default StyledLayout
