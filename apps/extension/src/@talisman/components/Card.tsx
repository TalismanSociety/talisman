import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"

export const Card: FC<{
  title?: ReactNode
  description?: ReactNode
  cta?: ReactNode
  className?: string
}> = ({ className, title, description, cta }) => {
  return (
    <div className={classNames("bg-grey-800 flex w-full flex-col gap-10 rounded p-10", className)}>
      {title && <div>{title}</div>}
      {description && <div>{description}</div>}
      {cta && <div>{cta}</div>}
    </div>
  )
}
