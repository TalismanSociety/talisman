import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"

interface ContainerProps {
  children: ReactNode
  className?: string
}

export const Container: FC<ContainerProps> = ({ children, className }) => {
  return <div className={classNames("bg-grey-850 rounded-lg", className)}>{children}</div>
}
