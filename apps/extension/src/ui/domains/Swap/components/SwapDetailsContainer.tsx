import { classNames } from "@talismn/util"
import type { HTMLProps, ReactNode } from "react"

export const SwapDetailsContainer = ({
  className,
  children,
  ...divProps
}: {
  className?: string
  children: ReactNode
} & HTMLProps<HTMLDivElement>) => (
  <div
    className={classNames("flex w-full flex-col gap-4 rounded bg-grey-900 p-8", className)}
    {...divProps}
  >
    {children}
  </div>
)
