import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"

import type { FC, ReactNode } from "react"

import { IconButton } from "./IconButton"

type ModalDialogProps = {
  title?: ReactNode
  id?: string
  className?: string
  contentClassName?: string
  onCloseClick?: () => void
  children?: ReactNode
} & ({ variant?: "dialog"; onBackClick?: never } | { variant: "wizard"; onBackClick?: () => void })

export const ModalDialog: FC<ModalDialogProps> = ({
  id,
  title,
  variant = "dialog",
  className,
  contentClassName,
  onBackClick,
  onCloseClick,
  children,
}) => {
  const isWizard = variant === "wizard"

  return (
    <div
      id={id}
      className={cn(
        "flex h-150 max-h-full w-100 max-w-full flex-col overflow-hidden rounded border border-grey-850 bg-black",
        className
      )}
      tabIndex={-1} // reset to prevent tab key from giving focus to elements below the modal
    >
      <header className="flex w-full shrink-0 items-center justify-between gap-8 overflow-hidden p-10">
        {isWizard && (
          <IconButton onClick={onBackClick} className={cn(!onBackClick && "invisible")}>
            <ChevronLeftIcon />
          </IconButton>
        )}
        <h1
          className={cn(
            "grow overflow-hidden text-ellipsis whitespace-nowrap font-bold text-base",
            isWizard && "text-center"
          )}
        >
          {title}
        </h1>
        {(isWizard || !!onCloseClick) && (
          <IconButton onClick={onCloseClick} className={cn(!onCloseClick && "invisible")}>
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
