import type { FC, ReactNode } from "react"

export const HeaderBlock: FC<{
  title?: ReactNode
  text?: ReactNode
  className?: string
}> = ({ title, text, className }) => (
  <header className={className}>
    {title && <h1 className="text-body text-lg">{title}</h1>}
    {text && <p className="mt-4 text-body-secondary text-sm">{text}</p>}
  </header>
)
