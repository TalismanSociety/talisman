import { cn } from "@ui/util/cn"
import type { FC, ReactNode } from "react"

export const Card: FC<{
  title?: ReactNode
  description?: ReactNode
  cta?: ReactNode
  className?: string
}> = ({ className, title, description, cta }) => {
  return (
    <div className={cn("flex w-full flex-col gap-10 rounded bg-grey-800 p-10", className)}>
      {title && <div>{title}</div>}
      {description && <div>{description}</div>}
      {cta && <div>{cta}</div>}
    </div>
  )
}
