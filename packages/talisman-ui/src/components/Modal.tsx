import { Transition } from "@headlessui/react"
import { classNames } from "@talismn/util"
import { FC, MouseEventHandler, ReactNode, useCallback } from "react"
import { createPortal } from "react-dom"

type ModalProps = {
  children: ReactNode
  blur?: boolean
  isOpen?: boolean
  className?: string
  containerId?: string
  onDismiss?: () => void
}

export const Modal: FC<ModalProps> = ({
  children,
  blur,
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

  const container = (containerId && document.getElementById(containerId)) || document.body

  return createPortal(
    <Transition show={!!isOpen}>
      <Transition.Child
        className={classNames(
          "bg-grey-900/50 top-0 left-0 z-10 h-full w-full",
          containerId ? "absolute" : "fixed",
          blur && "backdrop-blur-sm",
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
          "top-0 left-0 z-20 h-full w-full",
          "flex flex-col items-center justify-center",
          "pointer-events-none",
          containerId ? "absolute" : "fixed"
        )}
      >
        <Transition.Child
          appear
          className={classNames("pointer-events-auto", className)}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-50"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-50"
        >
          {children}
        </Transition.Child>
      </div>
    </Transition>,
    container
  )
}
