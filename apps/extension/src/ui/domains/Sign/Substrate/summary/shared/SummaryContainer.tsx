import { AlertCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import type { FC, PropsWithChildren } from "react"

export const SummaryContainer: FC<PropsWithChildren & { className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={classNames(
      "mt-4 mb-8 rounded text-left leading-paragraph",
      "border border-grey-700 bg-grey-850 text-body-secondary",
      "empty:hidden",
      className
    )}
  >
    {children}
  </div>
)

export const SummaryContent: FC<PropsWithChildren & { className?: string }> = ({
  children,
  className,
}) => <div className={classNames("px-8 py-4", className)}>{children}</div>

export const SummaryAlert: FC<PropsWithChildren & { className?: string }> = ({
  children,
  className,
}) => (
  <div className={classNames("flex w-full items-stretch gap-3 px-8 py-4 text-xs", className)}>
    <div>
      <AlertCircleIcon className="inline-block shrink-0 align-text-top text-primary text-sm" />
    </div>
    <div className="grow">{children}</div>
  </div>
)

export const SummarySeparator: FC<{ className?: string }> = ({ className }) => (
  <div className={classNames("h-0.5 shrink-0 bg-grey-700", className)} />
)
