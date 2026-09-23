import { Skeleton } from "@ui/components/Skeleton"
import { cn } from "@ui/util/cn"
import type { FC } from "react"

/** Inline skeleton for sidebar text rows — includes sizing to match text line height. */
export const TextSkeleton: FC<{ className?: string }> = ({ className }) => (
  <Skeleton className={cn("my-px h-[0.9em] shrink-0", className)} />
)
