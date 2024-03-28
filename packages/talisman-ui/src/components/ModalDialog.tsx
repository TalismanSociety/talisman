import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"

import { IconButton } from "./IconButton"

type ModalDialogProps = {
  className?: string
  title?: ReactNode
  centerTitle?: boolean
  onClose?: () => void
  children?: ReactNode
}

export const ModalDialog: FC<ModalDialogProps> = ({
  className,
  title,
  centerTitle,
  onClose,
  children,
}) => {
  return (
    <div
      className={classNames(
        "border-grey-850 flex max-h-[100dvh] w-[42rem] max-w-[100dvw] flex-col overflow-hidden rounded border bg-black",
        className
      )}
      tabIndex={-1} // reset to prevent tab key from giving focus to elements below the modal
    >
      <header className="flex w-full items-center justify-between gap-8 overflow-hidden p-10">
        <h1
          className={classNames(
            "flex-grow overflow-hidden text-ellipsis whitespace-nowrap text-base",
            centerTitle && "text-center"
          )}
        >
          {title}
        </h1>
        {onClose && (
          <IconButton onClick={onClose}>
            <XIcon />
          </IconButton>
        )}
      </header>
      <div className="scrollable scrollable-800 flex-grow overflow-auto p-10 pt-0">{children}</div>
    </div>
  )
}
