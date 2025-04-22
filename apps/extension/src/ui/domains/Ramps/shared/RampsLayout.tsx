import { ChevronLeftIcon } from "@talismn/icons"
import { FC, ReactNode } from "react"
import { IconButton } from "talisman-ui"

export const RampsLayout: FC<{
  title?: ReactNode
  withBuySellToggle?: boolean
  onBackClick?: () => void
  topRight?: ReactNode
  children?: ReactNode
}> = ({ title, topRight, children, onBackClick }) => (
  <div className="relative flex h-full w-full flex-col">
    <div className="flex items-center justify-between px-10">
      <div className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center space-x-2">
        {onBackClick && (
          <IconButton onClick={onBackClick}>
            <ChevronLeftIcon />
          </IconButton>
        )}
        <div className="flex items-center justify-between">
          <div className="font-bold text-white">{title}</div>
        </div>
      </div>
      {<div className="flex items-center gap-2">{topRight}</div>}
    </div>
    <div className="w-full grow overflow-hidden">{children} </div>
  </div>
)
