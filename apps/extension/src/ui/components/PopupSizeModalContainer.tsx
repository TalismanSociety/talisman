import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import type { FC, PropsWithChildren } from "react"

export const PopupSizeModalContainer: FC<PropsWithChildren<{ id: string; className?: string }>> = ({
  id,
  className,
  children,
}) => {
  return (
    <div
      id={id} // containerId for sub modals
      className={cn(
        "relative h-150 max-h-dvh w-100 max-w-dvw overflow-hidden bg-black-primary",
        !IS_POPUP && "rounded-lg border border-grey-800 shadow-xs",
        className
      )}
    >
      {children}
    </div>
  )
}
