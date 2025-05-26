import { classNames } from "@talismn/util"
import { HTMLProps, ReactNode } from "react"

export const SwapDetailsContainer = ({
  className,
  children,
  ...divProps
}: {
  className?: string
  children: ReactNode
} & HTMLProps<HTMLDivElement>) => (
  <div
    className={classNames("bg-grey-900 flex w-full flex-col gap-4 rounded p-8", className)}
    {...divProps}
  >
    {children}
  </div>
)
