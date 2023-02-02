import { InfoIcon } from "@talisman/theme/icons"
import { FC, PropsWithChildren } from "react"
import { classNames } from "talisman-ui"

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
}

export const SignAlertMessage: FC<SignAlertMessageProps> = ({
  children,
  className,
  type = "warning",
  iconSize = "xl",
}) => {
  return (
    <div
      className={classNames(
        "bg-black-tertiary flex w-full items-center gap-4 rounded-sm p-5",
        className
      )}
    >
      <div className={classNames("text-alert-warn", getIconSizeClass(iconSize))}>
        <InfoIcon />
      </div>
      <div
        className={classNames(
          "scrollable scrollable-700 grow overflow-y-auto text-left text-xs leading-[140%]",
          // orange text for errors
          type === "error" ? "text-alert-warn" : "text-body-secondary"
        )}
      >
        {children}
      </div>
    </div>
  )
}
