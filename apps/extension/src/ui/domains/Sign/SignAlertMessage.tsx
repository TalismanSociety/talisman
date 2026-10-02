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

/**
 * An error alert says what kind of failure it shows. null: it warns about what the request does
 * (an unlimited approval, a domain mismatch), which is no failure, so no error_shown is sent.
 */
type AlertKind =
  | { type?: "warning"; errorCategory?: null }
  | { type: "error"; errorCategory: ErrorCategory | null }

type SignAlertMessageProps = PropsWithChildren &
  AlertKind & {
    className?: string
    iconSize?: IconSize
    processing?: boolean
  }

export const SignAlertMessage: FC<SignAlertMessageProps> = ({
  children,
  className,
  type = "warning",
  iconSize = "base",
  processing,
  errorCategory,
}) => {
  useErrorShown({
    shown: type === "error" && !!errorCategory && "error",
    surface: "alert",
    category: errorCategory ?? "unknown",
  })

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
