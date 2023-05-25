import { Transition } from "@headlessui/react"
import { classNames } from "@talismn/util"
import { FC, MouseEventHandler, ReactNode, Suspense, useCallback } from "react"
import { createPortal } from "react-dom"

type ModalProps = {
  children: ReactNode
  isOpen?: boolean
  className?: string
  containerId?: string
  onDismiss?: () => void
}

export const Modal: FC<ModalProps> = ({ children, isOpen, className, containerId, onDismiss }) => {
  const handleDismiss: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (!onDismiss) return
      e.stopPropagation()
      onDismiss()
    },
    [onDismiss]
  )

  const container = (containerId && document.getElementById(containerId)) || document.body

  return createPortal(
    <Transition show={!!isOpen} appear>
      <Transition.Child
        className={classNames(
          "bg-grey-900/50 left-0 top-0 z-10 h-full w-full backdrop-blur-sm",
          containerId ? "absolute" : "fixed",
          onDismiss && "cursor-pointer"
        )}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        onClick={handleDismiss}
      ></Transition.Child>
      <div
        className={classNames(
          "left-0 top-0 z-20 h-full w-full",
          "flex flex-col items-center justify-center",
          "pointer-events-none",
          containerId ? "absolute" : "fixed"
        )}
      >
        <Transition.Child
          className={classNames("pointer-events-auto", className)}
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-90"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Transition.Child>
      </div>
    </Transition>,
    container
  )
}
