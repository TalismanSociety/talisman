import { cn } from "@ui/util/cn"
import type { FC, ReactNode } from "react"

type DrawerContentProps = {
  className?: string
  children?: ReactNode
}

export const DrawerContent: FC<DrawerContentProps> = ({ className, children }) => (
  <div className={cn("w-full rounded-t-xl border-grey-850 border-t bg-black p-12", className)}>
    {children}
  </div>
)
