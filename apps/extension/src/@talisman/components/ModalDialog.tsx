import { ReactComponent as IconClose } from "@talisman/theme/icons/x.svg"
import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"
import { IconButton } from "talisman-ui"

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
        "bg-grey-850 border-grey-800 flex max-h-full w-[42rem] max-w-full flex-col overflow-hidden rounded border",
        className
      )}
      tabIndex={-1} // reset to prevent tab key from giving focus to elements below the modal
    >
      <header className="flex w-full items-center justify-between gap-8 overflow-hidden p-10">
        {centerTitle && <div className="w-12 shrink-0"></div>}
        <h1
          className={classNames(
            "flex-grow overflow-hidden text-base",
            centerTitle && "text-center"
          )}
        >
          {title}
        </h1>
        {onClose && (
          <IconButton onClick={onClose}>
            <IconClose />
          </IconButton>
        )}
      </header>
      <div className="scrollable scrollable-800 flex-grow overflow-auto p-10 pt-0">{children}</div>
    </div>
  )
}
