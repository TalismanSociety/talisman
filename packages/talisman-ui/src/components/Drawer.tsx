import { Transition } from "@headlessui/react"
import { classNames } from "@talismn/util"
import { FC, MouseEventHandler, ReactNode, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"

type DrawerAnchor = "top" | "right" | "bottom" | "left"

type AnchorClasses = {
  position: string
  drawer?: string
  enterFrom: string
  enterTo: string
  leaveFrom: string
  leaveTo: string
}

const getAnchorClasses = (anchor: DrawerAnchor, withContainer: boolean): AnchorClasses => {
  const position = withContainer ? "absolute" : "fixed"
  const leftRight = withContainer ? "h-full max-w-full" : "h-screen max-w-[100vw]"
  const topBottom = withContainer ? "w-full max-h-full" : "w-screen max-h-[100vh]"

  switch (anchor) {
    case "right":
      return {
        position,
        drawer: classNames("top-0 right-0", position, leftRight),
        enterFrom: "translate-x-full",
        enterTo: "translate-x-0",
        leaveFrom: "translate-x-0",
        leaveTo: "translate-x-full",
      }
    case "left":
      return {
        position,
        drawer: classNames("top-0 left-0", position, leftRight),
        enterFrom: "translate-x-[-100%]",
        enterTo: "translate-x-0",
        leaveFrom: "translate-x-0",
        leaveTo: "translate-x-[-100%]",
      }
    case "top":
      return {
        position,
        drawer: classNames("top-0 left-0", position, topBottom),
        enterFrom: "translate-y-[-100%]",
        enterTo: "translate-y-0",
        leaveFrom: "translate-y-0",
        leaveTo: "translate-y-[-100%]",
      }
    case "bottom":
      return {
        position,
        drawer: classNames("bottom-0 left-0", position, topBottom),
        enterFrom: "translate-y-full",
        enterTo: "translate-y-0",
        leaveFrom: "translate-y-0",
        leaveTo: "translate-y-full",
      }
  }
}

type DrawerProps = {
  anchor: DrawerAnchor
  children: ReactNode
  isOpen?: boolean
  className?: string
  containerId?: string
  onDismiss?: () => void
}

export const Drawer: FC<DrawerProps> = ({
  anchor,
  children,
  isOpen,
  className,
  containerId,
  onDismiss,
}) => {
  const handleDismiss: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (!onDismiss) return

      e.stopPropagation()
      onDismiss()
    },
    [onDismiss]
  )

  const { position, drawer, enterFrom, enterTo, leaveFrom, leaveTo } = useMemo(
    () => getAnchorClasses(anchor, !!containerId),
    [anchor, containerId]
  )

  const container = (containerId && document.getElementById(containerId)) || document.body

  return createPortal(
    <Transition show={!!isOpen}>
      {/* Background overlay */}
      <Transition.Child
        className={classNames(
          "bg-grey-900 left-0 top-0 z-10 h-full w-full bg-opacity-50",
          onDismiss ? "cursor-pointer" : "cursor-not-allowed",
          position
        )}
        enter="transition-opacity ease-linear duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        onClick={handleDismiss}
      ></Transition.Child>

      {/* Drawer */}
      <Transition.Child
        className={classNames("z-10 shadow-2xl", position, drawer, className)}
        enter="transition-transform ease-in-out duration-300 transform"
        enterFrom={enterFrom}
        enterTo={enterTo}
        leave="transition-transform ease-in-out duration-300 transform"
        leaveFrom={leaveFrom}
        leaveTo={leaveTo}
      >
        {children}
      </Transition.Child>
    </Transition>,
    container
  )
}
