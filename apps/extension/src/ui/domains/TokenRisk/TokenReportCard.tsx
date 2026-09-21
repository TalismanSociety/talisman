import { cn } from "@ui/util/cn"
import type { FC, ReactNode } from "react"

export const TOKEN_REPORT_BUTTON_CLASS_NAME =
  "flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-xs"

export const TokenReportCard: FC<{
  logo: ReactNode
  title: ReactNode
  action: ReactNode
  className?: string
}> = ({ logo, title, action, className }) => (
  <div
    className={cn(
      "flex h-20 w-full items-center gap-4 rounded-lg border border-grey-700 px-6 text-left",
      className
    )}
  >
    <div className="flex w-16 shrink-0 justify-center">{logo}</div>
    <div className="text-body text-sm leading-none!">{title}</div>
    <div className="grow"></div>
    {action}
  </div>
)
