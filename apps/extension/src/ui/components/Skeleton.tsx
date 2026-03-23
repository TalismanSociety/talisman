import { cn } from "@ui/util/cn"
import type { FC, PropsWithChildren } from "react"

export const Skeleton: FC<PropsWithChildren<{ className?: string }>> = ({
  className,
  children,
}) => (
  <div
    aria-hidden="true"
    className={cn("animate-pulse rounded-xs bg-grey-800 text-grey-800", className)}
  >
    {children}
  </div>
)
