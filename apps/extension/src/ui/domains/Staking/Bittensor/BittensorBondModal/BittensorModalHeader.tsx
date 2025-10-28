import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { FC, ReactNode } from "react"
import { IconButton } from "talisman-ui"

import { useBittensorBondModal } from "../hooks/useBittensorBondModal"

export const BittensorStakingModalHeader: FC<{
  title: ReactNode
  className?: string
  withClose?: boolean
  onBackClick?: () => void
}> = ({ title, className, withClose, onBackClick }) => {
  const { close } = useBittensorBondModal()

  return (
    <div
      className={cn("text-body-secondary flex h-32 w-full shrink-0 items-center px-10", className)}
    >
      <IconButton onClick={onBackClick} className={cn(!onBackClick && "invisible")}>
        <ChevronLeftIcon />
      </IconButton>
      <div className="grow text-center font-bold text-white">{title}</div>
      <IconButton onClick={close} className={cn(!withClose && "invisible")}>
        <XIcon />
      </IconButton>
    </div>
  )
}
