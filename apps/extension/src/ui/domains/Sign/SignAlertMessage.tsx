import type { ErrorCategory } from "@common/analytics/errorCategory"
import { InfoIcon, LoaderIcon } from "@talismn/icons"
import { useErrorShown } from "@ui/hooks/analytics/errorShown"
import { cn } from "@ui/util/cn"

import type { FC, PropsWithChildren } from "react"

type IconSize = "xl" | "lg" | "md" | "base" | "sm"

const getIconSizeClass = (size: IconSize) => {
  switch (size) {
    case "base":
      return "text-base"
    case "md":
      return "text-md"
    case "sm":
      return "text-sm"
    case "lg":
      return "text-lg"
    case "xl":
      return "text-xl"
  }
}

type SignAlertMessageProps = PropsWithChildren & {
  className?: string
  type?: "warning" | "error"
  iconSize?: IconSize
  processing?: boolean
  /** What kind of failure an error alert shows. */
  errorCategory?: ErrorCategory
}

export const SignAlertMessage: FC<SignAlertMessageProps> = ({
  children,
  className,
  type = "warning",
  iconSize = "base",
  processing,
  errorCategory = "unknown",
}) => {
  useErrorShown({ shown: type === "error" && "error", surface: "alert", category: errorCategory })

  return (
    <div
      className={cn("flex w-full items-center gap-4 rounded-sm bg-alert-warn/10 p-5", className)}
    >
      <div
        className={cn(
          type === "error" ? "text-alert-warn" : "text-body-secondary",
          getIconSizeClass(iconSize)
        )}
      >
        {processing ? (
          <LoaderIcon className="animate-spin-slow transition-none" />
        ) : (
          <InfoIcon className="transition-none" />
        )}
      </div>
      <div
        className={cn(
          "scrollable scrollable-700 grow overflow-y-auto text-left text-xs leading-[140%]",
          type === "error" ? "text-alert-warn" : "text-body-secondary"
        )}
      >
        {children}
      </div>
    </div>
  )
}
