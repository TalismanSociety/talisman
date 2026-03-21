import { cn } from "@talismn/util"
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
        "relative h-[37.5rem] max-h-dvh w-[25rem] max-w-dvw overflow-hidden bg-black-primary",
        !IS_POPUP && "rounded-lg border border-grey-800 shadow-xs",
        className
      )}
    >
      {children}
    </div>
  )
}
