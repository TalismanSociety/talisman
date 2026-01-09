import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames, cn } from "@talismn/util"
import { FC, ReactNode } from "react"

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
        "border-grey-850 flex max-h-[100dvh] w-[42rem] max-w-[100dvw] flex-col overflow-hidden rounded border bg-black",
        className,
      )}
      tabIndex={-1} // reset to prevent tab key from giving focus to elements below the modal
    >
      <header className="z-10 flex w-full shrink-0 items-center justify-between gap-8 overflow-hidden p-10">
        <IconButton onClick={onBackClick} className={cn(onBackClick ? "visible" : "invisible")}>
          <ChevronLeftIcon />
        </IconButton>
        <h1 className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap text-center text-base font-bold">
          {title}
        </h1>
        <IconButton onClick={onCloseClick} className={cn(onCloseClick ? "visible" : "invisible")}>
          <XIcon />
        </IconButton>
      </header>
      <div
        className={cn(
          "scrollable scrollable-800 flex-grow overflow-auto p-10 pt-0",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}
