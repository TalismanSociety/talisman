import { cn } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

import { IS_POPUP } from "@ui/util/constants"

export const PopupSizeModalContainer: FC<PropsWithChildren<{ id: string; className?: string }>> = ({
  id,
  className,
  children,
}) => {
  return (
    <div
      id={id} // containerId for sub modals
      className={cn(
        "bg-black-primary relative h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] overflow-hidden",
        !IS_POPUP && "border-grey-800 rounded-lg border shadow",
        className,
      )}
    >
      {children}
    </div>
  )
  return <div>{children}</div>
}
