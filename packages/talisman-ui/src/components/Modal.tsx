import { Transition, TransitionChild } from "@headlessui/react"
import { classNames } from "@talismn/util"
import { FC, MouseEventHandler, ReactNode, Suspense, useCallback, useState } from "react"
import { createPortal } from "react-dom"

import { OpenCloseStatus, OpenCloseStatusProvider } from "../utils/useOpenCloseStatus"

type ModalProps = {
  children: ReactNode
  isOpen?: boolean
  className?: string
  containerId?: string
  anchor?: "center" | "bottom"
  onDismiss?: () => void
}

export const Modal: FC<ModalProps> = ({
  isOpen = false,
  anchor = "center",
  className,
  containerId,
  children,
  onDismiss,
}) => {
  const [status, setStatus] = useState<OpenCloseStatus>("closed")

  const handleDismiss: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (!onDismiss) return
      e.stopPropagation()
      onDismiss()
    },
    [onDismiss],
  )

  const container = (containerId && document.getElementById(containerId)) || document.body

  return createPortal(
    <Transition show={!!isOpen} appear>
      <TransitionChild
        as="div"
        className={classNames(
          "bg-grey-900/50 left-0 top-0 z-20 h-full w-full backdrop-blur-sm",
          containerId ? "absolute" : "fixed",
          onDismiss && "cursor-pointer",
        )}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        onClick={handleDismiss}
      ></TransitionChild>
      <div
        className={classNames(
          "left-0 top-0 z-20 h-full w-full overflow-hidden",
          "pointer-events-none flex flex-col items-center",
          containerId ? "absolute" : "fixed",
          anchor === "center" && "justify-center",
          anchor === "bottom" && "justify-end",
        )}
      >
        <TransitionChild
          as="div"
          className={classNames(
            "pointer-events-auto overflow-hidden",
            containerId ? "max-h-full max-w-full" : "max-h-[100dvh] max-w-[dvw]",
            className,
          )}
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-90"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
          beforeEnter={() => setStatus("opening")}
          afterEnter={() => setStatus("open")}
          beforeLeave={() => setStatus("closing")}
          afterLeave={() => setStatus("closed")}
        >
          <OpenCloseStatusProvider status={status}>
            <Suspense fallback={null}>{children}</Suspense>
          </OpenCloseStatusProvider>
        </TransitionChild>
      </div>
    </Transition>,
    container,
  )
}
