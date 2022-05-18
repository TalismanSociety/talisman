import { useOpenableComponent } from "@talisman/hooks/useOpenableComponent"
import { classNames } from "@talisman/util/classNames"
import { FC, MouseEventHandler, useRef } from "react"
import { createPortal } from "react-dom"
import styled from "styled-components"
import { TooltipBoundaryProvider } from "./Tooltip"

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0);
  transition: background var(--transition-speed-slower) ease-in-out;
  color: inherit;

  > .modal-content {
    transition: all var(--transition-speed-slower) ease-in-out;
    opacity: 0;
    filter: blur(1em);
    max-width: 100vw;
    max-height: 100vh;
  }

  &.modal-bottom {
    justify-content: flex-end;
  }

  &.modal-show {
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    > .modal-content {
      cursor: default;
      opacity: 1;
      filter: blur(0);
    }
  }

  &.modal-can-close {
    cursor: pointer;
  }
`
export type ModalAnchor = "center" | "bottom"

export type ModalProps = {
  anchor?: ModalAnchor
  open: boolean
  className?: string
  onClose?: () => void
}

const stopPropagation: MouseEventHandler<HTMLDivElement> = (e) => {
  e.stopPropagation()
}

export const Modal: FC<ModalProps> = ({
  open,
  anchor = "center",
  className,
  onClose,
  children,
}) => {
  const refModal = useRef<HTMLDivElement>(null)
  const { render, show } = useOpenableComponent(open, 300)

  if (!render) return null

  const classes = classNames(
    `modal modal-${anchor}`,
    show && "modal-show",
    onClose && "modal-can-close",
    className
  )

  // DOM node where the modal will be rendered
  const parent = document.getElementById("main") ?? document.getElementById("root") ?? document.body

  return createPortal(
    <Container
      className={classes}
      onClick={onClose}
      tabIndex={-1} // reset to prevent tab key from giving focus to elements below the modal
    >
      <div ref={refModal} onClick={stopPropagation} className="modal-content">
        {/* keep tooltips inside */}
        <TooltipBoundaryProvider refBoundary={refModal}>{children}</TooltipBoundaryProvider>
      </div>
    </Container>,
    parent
  )
}
