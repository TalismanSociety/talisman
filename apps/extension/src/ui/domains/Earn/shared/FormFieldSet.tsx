import { InfoIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { FC, PropsWithChildren, ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export const FormFieldSet: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-grey-850 flex w-full flex-col justify-center gap-2 rounded p-8 py-4",
        className,
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
        "text-body-secondary flex h-[1.5em] w-full items-center justify-between gap-4 overflow-hidden text-base",
        variant === "small" && "text-sm",
        variant === "xs" && "text-xs",
        className,
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
      <div className={cn("text-body max-w-full truncate", valueClassName)}>{children}</div>
    </div>
  )
}

export const FormFieldSetSeparator: FC<{ className?: string }> = ({ className }) => {
  return <div className={cn("bg-grey-800 my-4 h-px w-full shrink-0", className)} />
}
