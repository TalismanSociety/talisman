import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"

export const HeaderBlock: FC<{
  title?: ReactNode
  text?: ReactNode
  className?: string
}> = ({ title, text, className }) => (
  <header className={classNames("", className)}>
    {title && <h1 className="text-body text-lg">{title}</h1>}
    {text && <p className="text-body-secondary mt-8 text-base">{text}</p>}
  </header>
)
