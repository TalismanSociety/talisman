import { useState, useEffect, PropsWithChildren, useRef } from "react"
import useBoolean from "@talisman/hooks/useBoolean"
import styled from "styled-components"
import Link from "@talisman/components/Link"
import useOnClickOutside from "@talisman/hooks/useOnClickOutside"

type TPosition = "TOP_LEFT" | "TOP_CENTER" | "TOP_RIGHT" | "BOTTOM_LEFT"

type TProps = PropsWithChildren<{
  trigger: string | React.ReactNode
  pinned?: TPosition
  className?: string
  forceClose?: boolean
  closeOnMouseOut?: boolean
  tabIndex?: number
}>

const PopNavItem = ({ children, className, ...rest }: any) => {
  return (
    <Link className={className} small {...rest}>
      {children}
    </Link>
  )
}

const StyledPopNavItem = styled(PopNavItem)`
  display: block;
  width: 100%;
  padding: 0.4em 0.4em;
  text-align: left;
  user-select: none;

  &:hover {
    color: var(--color-primary);
  }
`

const PopNavContent = ({ children, className }: any) => {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  return (
    <nav
      className={`${className} nav`}
      data-is-mounted={isMounted}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </nav>
  )
}

const StyledPopNavContent = styled(PopNavContent)`
  max-height: 100rem;
  height: auto;
  padding: var(--padding-small);
  overflow: hidden;
  opacity: 1;
  transition: all var(--transition-speed-slow) ease-in-out;
  overflow-y: scroll;
  background: var(--color-background);
  border: 1px solid var(--color-background-muted);
  border-radius: var(--border-radius);
  min-width: 20rem;
  max-width: 25rem;
  z-index: 1;

  &[data-is-mounted="false"] {
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
  }
`

const PopNav = ({
  trigger,
  className,
  closeOnMouseOut,
  children,
  forceClose,
  tabIndex,
}: TProps) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  const [open, , setOpen] = useBoolean(false)
  const [closeTimeout, setCloseTimeout] = useState(setTimeout(() => {}, 0))

  useOnClickOutside(nodeRef, () => setOpen(false))

  useEffect(() => {
    if (forceClose) {
      setOpen(false)
    }
  }, [forceClose, setOpen])

  const handleMouseEnter = () => {
    clearTimeout(closeTimeout)
  }

  const handleMouseLeave = () => {
    if (!closeOnMouseOut) return
    clearTimeout(closeTimeout)
    setCloseTimeout(
      setTimeout(() => {
        setOpen(false)
      }, 150)
    )
  }

  return (
    <span
      ref={nodeRef}
      className={`popnav ${className}`}
      data-open={open}
      onClick={(e) => {
        e.stopPropagation()
        setOpen(!open)
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      tabIndex={tabIndex}
    >
      <span className="trigger">{trigger}</span>
      <span className="trigger-hit" />
      {!!open && <StyledPopNavContent>{children}</StyledPopNavContent>}
    </span>
  )
}

PopNav.Item = StyledPopNavItem

const StyledPopNav = styled(PopNav)`
  font: inherit;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;

  > .trigger > * {
    display: flex;
    font: inherit;
    color: inherit;
  }

  > nav {
    position: absolute;

    ${({ pinned }: TProps) => {
      switch (pinned) {
        case "BOTTOM_LEFT":
          return `bottom: 100%; left: 0;`
        case "TOP_LEFT":
          return `top: 100%; left: 0;`
        case "TOP_CENTER":
          return `top: 100%; left: 50%; transform: translateX(-50%)`
        case "TOP_RIGHT":
        default:
          return `top: 100%; right: 0;`
      }
    }}
  }

  .trigger-hit {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  &[data-open="true"] {
    overflow: visible;
    .trigger-hit {
      width: calc(100% + 4rem);
      height: calc(100% + 4rem);
      left: -2rem;
      top: -2rem;
    }
  }
`

export default StyledPopNav
