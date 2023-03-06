import { Transition } from "@headlessui/react"
import { classNames } from "@talismn/util"
import { default as clsx } from "clsx"
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
        drawer: classNames("top-0 right-0 max-w-[100vw]", position, leftRight),
        enterFrom: "translate-x-full",
        enterTo: "translate-x-0",
        leaveFrom: "translate-x-0",
        leaveTo: "translate-x-full",
      }
    case "left":
      return {
        position,
        drawer: classNames("top-0 left-0 max-w-[100vw]", position, leftRight),
        enterFrom: "translate-x-[-100%]",
        enterTo: "translate-x-0",
        leaveFrom: "translate-x-0",
        leaveTo: "translate-x-[-100%]",
      }
    case "top":
      return {
        position,
        drawer: classNames("top-0 left-0 max-h-[100vh]", position, topBottom),
        enterFrom: "translate-y-[-100%]",
        enterTo: "translate-y-0",
        leaveFrom: "translate-y-0",
        leaveTo: "translate-y-[-100%]",
      }
    case "bottom":
      return {
        position,
        drawer: classNames("bottom-0 left-0 max-h-[100vh]", position, topBottom),
        enterFrom: "translate-y-full",
        enterTo: "translate-y-0",
        leaveFrom: "translate-y-0",
        leaveTo: "translate-y-full",
      }
  }
}

type DrawerProps = {
  isOpen?: boolean
  onDismiss?: () => void
  children: ReactNode
  lightDismiss?: boolean
  className?: string
  anchor: DrawerAnchor
  containerId?: string
}

export const Drawer: FC<DrawerProps> = ({
  isOpen = false,
  children,
  onDismiss,
  lightDismiss,
  className,
  anchor,
  containerId,
}) => {
  const handleDismiss: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      e.stopPropagation()
      onDismiss?.()
    },
    [onDismiss]
  )

  const { position, drawer, enterFrom, enterTo, leaveFrom, leaveTo } = useMemo(
    () => getAnchorClasses(anchor, !!containerId),
    [anchor, containerId]
  )

  const container = (containerId && document.getElementById(containerId)) || document.body

  return createPortal(
    <Transition show={isOpen}>
      {/* Background overlay */}
      {lightDismiss && (
        <Transition.Child
          className={clsx(
            "bg-grey-900 top-0 left-0 z-40 h-full w-full bg-opacity-50",
            position,
            onDismiss ? "cursor-pointer" : ""
          )}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          onClick={handleDismiss}
        ></Transition.Child>
      )}

      {/* Drawer */}
      <Transition.Child
        className={classNames("z-50 shadow-2xl", position, drawer, className)}
        enter="transition ease-in-out duration-300 transform"
        enterFrom={enterFrom}
        enterTo={enterTo}
        leave="transition ease-in-out duration-300 transform"
        leaveFrom={leaveFrom}
        leaveTo={leaveTo}
      >
        {children}
      </Transition.Child>
    </Transition>,
    container
  )
}
