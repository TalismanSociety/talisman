import { FC, ReactNode } from "react"

export const Setting: FC<{
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
}> = ({ title, subtitle, children }) => (
  <div className="text-body-secondary bg-grey-850 flex w-full items-center justify-between rounded px-8 py-5">
    <div className="flex flex-col gap-3">
      <div className="text-body">{title}</div>
      {subtitle && <div className="text-xs">{subtitle}</div>}
    </div>
    {children}
  </div>
)
