import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import { cn } from "@ui/util/cn"
import type { FC, ReactNode } from "react"

export const RampsPickerLayout: FC<{
  title?: ReactNode
  onBackClick?: () => void
  onCloseClick?: () => void
  children?: ReactNode
}> = ({ title, children, onBackClick, onCloseClick }) => (
  <div className="relative flex h-full w-full flex-col">
    <div className="flex items-center justify-between px-10">
      <div className="flex h-32 min-h-32 w-full items-center gap-4 text-body-secondary">
        <IconButton onClick={onBackClick} className={cn(!onBackClick && "invisible")}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="grow text-center">{title}</div>
        <IconButton onClick={onCloseClick} className={cn(!onCloseClick && "invisible")}>
          <XIcon />
        </IconButton>
      </div>
    </div>
    <div className="w-full grow overflow-hidden">{children}</div>
  </div>
)
