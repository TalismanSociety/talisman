import { InfoIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

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
}

export const SignAlertMessage: FC<SignAlertMessageProps> = ({
  children,
  className,
  type = "warning",
  iconSize = "xl",
  processing,
}) => {
  return (
    <div
      className={classNames(
        "bg-black-tertiary flex w-full items-center gap-4 rounded-sm p-5",
        className
      )}
    >
      <div
        className={classNames(
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
        className={classNames(
          "scrollable scrollable-700 grow overflow-y-auto text-left text-xs leading-[140%]",
          type === "error" ? "text-alert-warn" : "text-body-secondary"
        )}
      >
        {children}
      </div>
    </div>
  )
}
