import { InfoIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC, PropsWithChildren } from "react"

type SignAlertMessageProps = PropsWithChildren & {
  className?: string
  type?: "warning" | "error"
}

export const SignAlertMessage: FC<SignAlertMessageProps> = ({
  children,
  className,
  type = "warning",
}) => {
  return (
    <div
      className={classNames(
        "bg-black-tertiary flex w-full items-center gap-4 rounded-sm p-5",
        className
      )}
    >
      <div className="text-alert-warn text-xl">
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
