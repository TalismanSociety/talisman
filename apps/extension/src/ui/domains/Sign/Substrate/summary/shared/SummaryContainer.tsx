import { AlertCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

export const SummaryContainer: FC<PropsWithChildren & { className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={classNames(
      "leading-paragraph mb-8 mt-4 rounded text-left",
      "bg-grey-850 border-grey-700 text-body-secondary border",
      "empty:hidden",
      className,
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
      <AlertCircleIcon className="text-primary inline-block shrink-0 align-text-top text-sm" />
    </div>
    <div className="grow">{children}</div>
  </div>
)

export const SummarySeparator: FC<{ className?: string }> = ({ className }) => (
  <div className={classNames("bg-grey-700 h-0.5 shrink-0", className)} />
)
