import { useOpenableComponent } from "@talisman/hooks/useOpenableComponent"
import { classNames } from "@talisman/util/classNames"
import { FC, ReactNode } from "react"
import { createPortal } from "react-dom"
import styled from "styled-components"

export type DrawerAnchor = "left" | "right" | "top" | "bottom"

export type DrawerProps = {
  anchor: DrawerAnchor
  open: boolean
  withHeader?: boolean
  onClose?: () => void
  fullScreen?: boolean
  asChild?: boolean
  className?: string
  children?: ReactNode
}

const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
  box-sizing: border-box;

  .drawer-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--color-background);
    transition: opacity var(--transition-speed-slow) ease-in;
    cursor: not-allowed;
    opacity: 0;
  }

  .drawer-content {
    z-index: 1;
    position: absolute;
    max-width: 100%;
    max-height: 100%;
    overflow: scroll;
    scrollbar-width: none;
    transition: transform var(--transition-speed-slow) ease-in-out;
  }

  &.drawer-top .drawer-content {
    top: 0;
    left: 0;
    width: 100%;
    max-height: 100%;
    transform: translateY(-100%);
  }

  &.drawer-bottom .drawer-content {
    bottom: 0;
    left: 0;
    width: 100%;
    max-height: 100%;
    transform: translateY(100%);
  }

  &.drawer-left .drawer-content {
    top: 0;
    left: 0;
    max-width: 100%;
    height: 100%;
    transform: translateX(-100%);
  }

  &.drawer-right .drawer-content {
    top: 0;
    right: 0;
    max-width: 100%;
    height: 100%;
    transform: translateX(100%);
  }

  &.drawer-fullscreen .drawer-content {
    height: 100%;
    width: 100%;
  }

  &.drawer-can-close .drawer-bg {
    cursor: pointer;
  }

  &.drawer-show {
    .drawer-bg {
      opacity: 0.6;
    }
    .drawer-content {
      transform: translateX(0) translateY(0);
    }
  }
`

export const Drawer: FC<DrawerProps> = ({
  children,
  anchor,
  open,
  onClose,
  fullScreen = false,
  asChild = false,
  className,
}) => {
  const { render, show } = useOpenableComponent(open, 200)

  if (!render) return null

  const classes = classNames(
    "drawer",
    `drawer-${anchor}`,
    show && "drawer-show",
    fullScreen && "drawer-fullscreen",
    onClose && "drawer-can-close",
    className
  )

  const output = (
    <Container className={classes}>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer-content">{children}</div>
    </Container>
  )

  if (asChild) return output

  // DOM node where the drawer will be rendered
  const parent = document.getElementById("main") ?? document.getElementById("root") ?? document.body

  return createPortal(output, parent)
}
