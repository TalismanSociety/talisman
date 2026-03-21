import { XIcon } from "@talismn/icons"
import { classNames, cn } from "@talismn/util"
import type { FC, ReactNode } from "react"

import { IconButton } from "./IconButton"

type ModalDialogProps = {
  className?: string
  title?: ReactNode
  centerTitle?: boolean
  onClose?: () => void
  children?: ReactNode
  id?: string
  contentClassName?: string
}

/**
 * @deprecated Prefer using WizardModalDialog for new features
 */
export const ModalDialog: FC<ModalDialogProps> = ({
  id,
  className,
  title,
  centerTitle,
  onClose,
  children,
  contentClassName,
}) => {
  return (
    <div
      id={id}
      className={classNames(
        "flex max-h-dvh w-105 max-w-dvw flex-col overflow-hidden rounded border border-grey-850 bg-black",
        className
      )}
      tabIndex={-1} // reset to prevent tab key from giving focus to elements below the modal
    >
      <header className="z-10 flex w-full items-center justify-between gap-8 overflow-hidden p-10">
        {!!centerTitle && !!onClose && (
          // placeholder to keep the title centered
          <IconButton className="invisible">
            <XIcon />
          </IconButton>
        )}
        <h1
          className={classNames(
            "grow overflow-hidden text-ellipsis whitespace-nowrap font-bold text-base",
            centerTitle && "text-center"
          )}
        >
          {title}
        </h1>
        {!!onClose && (
          <IconButton onClick={onClose}>
            <XIcon />
          </IconButton>
        )}
      </header>
      <div
        className={cn("scrollable scrollable-800 grow overflow-auto p-10 pt-0", contentClassName)}
      >
        {children}
      </div>
    </div>
  )
}
