import { cn } from "@talismn/util"
import { FC, PropsWithChildren, ReactNode } from "react"

export const BittensorModalLayout: FC<
  PropsWithChildren<{ header?: ReactNode; className?: string; contentClassName?: string }>
> = ({ header, className, contentClassName, children }) => {
  return (
    <div className={cn("flex size-full flex-col overflow-hidden", className)}>
      {header}
      <div className={cn("grow overflow-hidden", contentClassName)}>{children}</div>
    </div>
  )
}
