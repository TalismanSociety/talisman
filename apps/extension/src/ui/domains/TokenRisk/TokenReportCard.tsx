import { cn } from "@ui/util/cn"
import type { FC, ReactNode } from "react"

export const TOKEN_REPORT_BUTTON_CLASS_NAME =
  "flex h-14 shrink-0 items-center gap-2 rounded-full px-6 text-sm"

export const TokenReportCard: FC<{
  logo: ReactNode
  title: ReactNode
  subtitle: ReactNode
  action: ReactNode
  className?: string
}> = ({ logo, title, subtitle, action, className }) => (
  <div
    className={cn(
      "flex h-28 w-full items-center gap-4 rounded-lg border border-grey-700 px-6 text-left",
      className
    )}
  >
    <div className="flex w-20 shrink-0 justify-center">{logo}</div>
    <div className="flex flex-col gap-3">
      <div className="text-body text-sm leading-none!">{title}</div>
      <div className="text-body-secondary text-xs leading-none!">{subtitle}</div>
    </div>
    <div className="grow"></div>
    {action}
  </div>
)
