import { classNames } from "@talismn/util"
import { ReactNode } from "react"

type OnboardDialogProps = {
  title?: string
  children: ReactNode
  className?: string
}

export const OnboardDialog = ({ title, children, className }: OnboardDialogProps) => (
  <div className={classNames("flex w-[60rem] flex-col items-center gap-12", className)}>
    <div
      className={classNames(
        "bg-body/5 transform-gpu backdrop-blur-xl",
        "flex w-full flex-col gap-16 rounded-lg p-16 text-left",
      )}
    >
      {title && <div className="text-xl text-white">{title}</div>}
      <div className={`text-body-secondary`}>{children}</div>
    </div>
  </div>
)
