import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { IconButton } from "@ui/talisman-ui/components/IconButton"
import type { FC, ReactNode } from "react"

export const RampsPickerLayout: FC<{
  title?: ReactNode
  onBackClick?: () => void
  onCloseClick?: () => void
  children?: ReactNode
}> = ({ title, children, onBackClick, onCloseClick }) => (
  <div className="relative flex h-full w-full flex-col">
    <div className="flex items-center justify-between px-10">
      <div className="flex h-32 min-h-[6.4rem] w-full items-center gap-4 text-body-secondary">
        <IconButton onClick={onBackClick} className={classNames(!onBackClick && "invisible")}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="grow text-center">{title}</div>
        <IconButton onClick={onCloseClick} className={classNames(!onCloseClick && "invisible")}>
          <XIcon />
        </IconButton>
      </div>
    </div>
    <div className="w-full grow overflow-hidden">{children}</div>
  </div>
)
