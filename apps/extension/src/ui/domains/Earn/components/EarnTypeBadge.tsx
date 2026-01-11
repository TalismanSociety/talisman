import { cn } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

export const EarnTypeBadge: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      // TODO fix text-tiny which currently makes color white, use text-[1rem] for now
      "rounded-xs text-body-inactive mx-3 border px-2 py-1 align-middle text-[1rem] font-medium uppercase",
      className,
    )}
  >
    {children}
  </span>
)
