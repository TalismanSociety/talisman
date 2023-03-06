import { Transition } from "@headlessui/react"
import { classNames } from "@talismn/util"
import { default as clsx } from "clsx"
import { MouseEventHandler, ReactNode, useCallback } from "react"

type DrawerAnchor = "top" | "right" | "bottom" | "left"

type DrawerProps = {
  isOpen?: boolean
  onDismiss?: () => void
  children: ReactNode
  lightDismiss?: boolean
  className?: string
  anchor: DrawerAnchor
}

type AnchorClasses = {
  container: string
  enterFrom: string
  enterTo: string
  leaveFrom: string
  leaveTo: string
}

const getAnchorClasses = (anchor: DrawerAnchor): AnchorClasses => {
  switch (anchor) {
    case "right":
      return {
        container: "fixed top-0 right-0 h-screen max-w-[100vw]",
        enterFrom: "translate-x-full",
        enterTo: "translate-x-0",
        leaveFrom: "translate-x-0",
        leaveTo: "translate-x-full",
      }
    case "top":
    case "bottom":
    case "left":
    default:
      return {
        container: "string",
        enterFrom: "string",
        enterTo: "string",
        leaveFrom: "string",
        leaveTo: "string",
      }
  }
}

export const Drawer = ({
  isOpen = false,
  children,
  onDismiss,
  lightDismiss,
  className,
  anchor,
}: DrawerProps) => {
  const handleDismiss: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      e.stopPropagation()
      onDismiss?.()
    },
    [onDismiss]
  )

  const { container, enterFrom, enterTo, leaveFrom, leaveTo } = getAnchorClasses(anchor)

  return (
    <Transition show={isOpen}>
      {/* Background overlay */}
      {lightDismiss && (
        <Transition.Child
          data-testid="sidepanel-overlay"
          className={clsx(
            "bg-grey-900 fixed top-0 left-0 z-40 h-full w-full bg-opacity-50",
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

      {/* Sliding sidebar */}
      <Transition.Child
        data-testid="sidepanel-panel"
        className={classNames("z-50 shadow-2xl", container, className)}
        enter="transition ease-in-out duration-300 transform"
        enterFrom={enterFrom}
        enterTo={enterTo}
        leave="transition ease-in-out duration-300 transform"
        leaveFrom={leaveFrom}
        leaveTo={leaveTo}
      >
        {children}
        {/* <div className="bg-grey-900 flex h-12 w-full text-white">
          <div className="flex w-full flex-grow items-center pl-4 pr-1">
            <h3 data-testid="sidepanel-title" className="grow text-xl">
              {title}
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="h-10 bg-opacity-0 p-2 transition hover:bg-opacity-20 active:bg-opacity-20"
              >
                <IconX className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
        <div className="text-grey-200 flex-grow overflow-y-hidden text-base font-normal">
          {children}
        </div> */}
      </Transition.Child>
    </Transition>
  )
}
