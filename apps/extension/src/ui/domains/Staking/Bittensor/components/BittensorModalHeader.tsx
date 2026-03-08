import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { IconButton } from "@ui/components/IconButton"
import type { FC, ReactNode } from "react"

export const BittensorStakingModalHeader: FC<{
  title: ReactNode
  className?: string
  withClose?: boolean
  onBackClick?: () => void
  onCloseModal: () => void
}> = ({ title, className, withClose, onBackClick, onCloseModal }) => {
  return (
    <div
      className={cn("flex h-32 w-full shrink-0 items-center px-10 text-body-secondary", className)}
    >
      <IconButton onClick={onBackClick} className={cn(!onBackClick && "invisible")}>
        <ChevronLeftIcon />
      </IconButton>
      <div className="grow text-center font-bold text-white">{title}</div>
      <IconButton onClick={onCloseModal} className={cn(!withClose && "invisible")}>
        <XIcon />
      </IconButton>
    </div>
  )
}
