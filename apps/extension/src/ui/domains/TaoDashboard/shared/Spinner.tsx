import { cn } from "@talismn/util"
import type { FC } from "react"

/** Circular spinner used for loading states across TaoDashboard. */
export const Spinner: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "size-[40px] animate-spin rounded-full border-[3px] border-grey-600 border-t-grey-400",
      className
    )}
  />
)
