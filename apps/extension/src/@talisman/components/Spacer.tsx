import { classNames } from "@talismn/util"
import { FC } from "react"

export const Spacer: FC<{
  large?: boolean
  small?: boolean
  className?: string
}> = ({ large, small, className }) => (
  <div className={classNames(large ? "h-16" : small ? "h-8" : "h-12", className)} />
)
