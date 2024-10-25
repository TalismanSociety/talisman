import { classNames } from "@talismn/util"
import {
  DetailedHTMLProps,
  FC,
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { useLocation } from "react-router-dom"

import { ErrorBoundary } from "@talisman/components/ErrorBoundary"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { HandMonoLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"

import { BottomNav } from "../components/Navigation/BottomNav"
import { NavigationDrawer } from "../components/Navigation/NavigationDrawer"

type ContainerProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>

export const PopupHeader: FC<ContainerProps & { right?: ReactNode }> = ({
  className,
  children,
  right,
  ...props
}) => {
  const handleLogoClick = useCallback(() => {
    api.dashboardOpen("/")
  }, [])

  return (
    <header
      {...props}
      className={classNames(
        "flex h-32 w-full shrink-0 items-center justify-between px-12",
        className,
      )}
    >
      <div className="w-16 shrink-0 text-xl">
        <HandMonoLogo onClick={handleLogoClick} />
      </div>
      <div>{children}</div>
      <div className="w-16 shrink-0">{right}</div>
    </header>
  )
}

export const PopupContent: FC<ContainerProps & { withBottomNav?: boolean }> = ({
  withBottomNav,
  className,
  children,
  ...props
}) => {
  //scrollToTop on location change
  const scrollableRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    scrollableRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <ScrollContainer
      {...props}
      ref={scrollableRef}
      className={classNames("w-full flex-grow overflow-hidden px-8", className)}
    >
      {children}
      {!!withBottomNav && (
        <>
          <BottomNav />
          <NavigationDrawer />
        </>
      )}
    </ScrollContainer>
  )
}

export const PopupFooter: FC<ContainerProps> = ({ className, ...props }) => {
  return <footer {...props} className={classNames("shrink-0 px-12 py-10", className)} />
}

export const PopupLayout: FC<ContainerProps> = ({ className, children, ...props }) => {
  return (
    <main
      id="main"
      {...props}
      className={classNames("relative flex h-full w-full flex-col overflow-hidden", className)}
    >
      <ErrorBoundary>{children}</ErrorBoundary>
    </main>
  )
}
