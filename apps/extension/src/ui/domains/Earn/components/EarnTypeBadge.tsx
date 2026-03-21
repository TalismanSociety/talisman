import { cn } from "@talismn/util"
import type { FC, PropsWithChildren } from "react"

export const EarnTypeBadge: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      // TODO fix text-tiny which currently makes color white, use text-tiny for now
      "mx-3 rounded-xs border px-2 py-1 align-middle font-medium text-body-inactive text-tiny uppercase",
      className
    )}
  >
    {children}
  </span>
)
