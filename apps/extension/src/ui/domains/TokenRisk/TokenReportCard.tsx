import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { cn } from "@ui/util/cn"
import type { FC, PropsWithChildren, ReactNode } from "react"

export const TOKEN_REPORT_BUTTON_CLASS_NAME =
  "flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-xs"

export const TokenReportCard: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => (
  <div
    className={cn("flex w-full flex-col gap-6 rounded border border-grey-700 px-6 py-6", className)}
  >
    {children}
  </div>
)

export const TokenReportPlaceholderPill: FC<PropsWithChildren<{ tooltip?: ReactNode }>> = ({
  children,
  tooltip,
}) => {
  const pill = (
    <div className={cn(TOKEN_REPORT_BUTTON_CLASS_NAME, "bg-grey-800 text-body-disabled")}>
      {children}
    </div>
  )

  if (!tooltip) return pill

  return (
    <Tooltip placement="top">
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export const TokenReportRow: FC<{
  logo: ReactNode
  title: ReactNode
  action: ReactNode
}> = ({ logo, title, action }) => (
  <div className="flex w-full items-center gap-4 text-left">
    <div className="flex w-16 shrink-0 justify-center">{logo}</div>
    <div className="text-body text-sm leading-none!">{title}</div>
    <div className="grow"></div>
    {action}
  </div>
)
