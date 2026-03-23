import { InfoIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { cn } from "@ui/util/cn"
import type { FC, PropsWithChildren, ReactNode } from "react"

export const FormFieldSet: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col justify-center gap-2 rounded bg-grey-850 p-8 py-4",
        className
      )}
    >
      {children}
    </div>
  )
}

export const FormFieldSetRow: FC<
  PropsWithChildren<{
    variant?: "xs" | "small" | "default"
    label: ReactNode
    description?: string
    className?: string
    labelClassName?: string
    valueClassName?: string
  }>
> = ({
  variant = "default",
  label,
  description,
  children,
  className,
  labelClassName,
  valueClassName,
}) => {
  return (
    <div
      className={cn(
        "flex h-[1.5em] w-full items-center justify-between gap-4 overflow-hidden text-base text-body-secondary",
        variant === "small" && "text-sm",
        variant === "xs" && "text-xs",
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("shrink-0", labelClassName)}>
            <span>{label}</span>
            {!!description && (
              <InfoIcon className="ml-[0.5em] inline-block size-[1.2em] align-sub" />
            )}
          </div>
        </TooltipTrigger>
        {!!description && <TooltipContent>{description}</TooltipContent>}
      </Tooltip>
      <div className={cn("max-w-full truncate text-body", valueClassName)}>{children}</div>
    </div>
  )
}

export const FormFieldSetSeparator: FC<{ className?: string }> = ({ className }) => {
  return <div className={cn("my-4 h-px w-full shrink-0 bg-grey-800", className)} />
}
