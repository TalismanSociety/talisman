import { cn } from "@ui/util/cn"
import type { FC } from "react"

/** Generic skeleton placeholder used across TaoDashboard charts and headers. */
export const Skeleton: FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse rounded-xs bg-grey-800", className)} />
)

/** Inline skeleton for sidebar text rows — includes sizing to match text line height. */
export const TextSkeleton: FC<{ className?: string }> = ({ className }) => (
  <Skeleton className={cn("my-px h-[0.9em] shrink-0 text-grey-800", className)} />
)
