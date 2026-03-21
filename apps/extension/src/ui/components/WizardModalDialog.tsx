import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames, cn } from "@talismn/util"
import type { FC, ReactNode } from "react"

import { IconButton } from "./IconButton"

export const WizardModalDialog: FC<{
  title?: ReactNode
  id?: string
  className?: string
  contentClassName?: string
  onBackClick?: () => void
  onCloseClick?: () => void
  children?: ReactNode
}> = ({ id, title, className, contentClassName, onBackClick, onCloseClick, children }) => {
  return (
    <div
      id={id}
      className={classNames(
        "flex h-150 max-h-full w-100 max-w-full flex-col overflow-hidden rounded border border-grey-850 bg-black",
        className
      )}
      tabIndex={-1} // reset to prevent tab key from giving focus to elements below the modal
    >
      <header className="flex w-full shrink-0 items-center justify-between gap-8 overflow-hidden p-10">
        <IconButton onClick={onBackClick} className={cn(onBackClick ? "visible" : "invisible")}>
          <ChevronLeftIcon />
        </IconButton>
        <h1 className="grow overflow-hidden text-ellipsis whitespace-nowrap text-center font-bold text-base">
          {title}
        </h1>
        <IconButton onClick={onCloseClick} className={cn(onCloseClick ? "visible" : "invisible")}>
          <XIcon />
        </IconButton>
      </header>
      <div
        className={cn("scrollable scrollable-800 grow overflow-auto p-10 pt-0", contentClassName)}
      >
        {children}
      </div>
    </div>
  )
}
