import React, { useState, useEffect, PropsWithChildren } from "react"
import styled from "styled-components"
import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import { NavigationDrawer } from "../components/Navigation/NavigationDrawer"
import { AddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"

export interface IProps extends PropsWithChildren<any> {
  isThinking?: boolean
  className?: any
}

const Layout = ({ isThinking, className, children }: IProps) => {
  const [header, setHeader] = useState<any>()
  const [content, setContent] = useState<any>()
  const [footer, setFooter] = useState<any>()

  useEffect(() => {
    const _children = React.Children.toArray(children)
    setHeader(_children.find(({ type }: any) => type.displayName === "layout-header"))
    setContent(_children.find(({ type }: any) => type.displayName === "layout-content"))
    setFooter(_children.find(({ type }: any) => type.displayName === "layout-footer"))
  }, [children])

  return (
    <main id="main" className={className}>
      <ErrorBoundary>
        {header}
        {content}
        {footer}
        <AddressFormatterModal />
        {/* NavigationDrawer here so user can see the drawer close smoothly in case he navigates from one page to another (as long as both page use this Layout) */}
        <NavigationDrawer />
      </ErrorBoundary>
    </main>
  )
}

const StyledLayout = styled(Layout)`
  margin: 0 auto;
  width: 36rem;
  height: 48rem;
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
