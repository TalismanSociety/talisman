import { cn } from "@talismn/util"
import { FC, PropsWithChildren, ReactNode } from "react"

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
    className?: string
    labelClassName?: string
    valueClassName?: string
  }>
> = ({ variant = "default", label, children, className, labelClassName, valueClassName }) => {
  return (
    <div
      className={cn(
        "text-body-secondary flex h-16 w-full items-center justify-between gap-4 overflow-hidden",
        variant === "small" && "h-12 text-sm",
        variant === "xs" && "h-10 text-xs",
        className,
      )}
    >
      <div className={cn("shrink-0", labelClassName)}>{label}</div>
      <div className={cn("text-body max-w-full truncate", valueClassName)}>{children}</div>
    </div>
  )
}

export const FormFieldSetSeparator: FC<{ className?: string }> = ({ className }) => {
  return <div className={cn("bg-grey-800 my-4 h-px w-full shrink-0", className)} />
}
