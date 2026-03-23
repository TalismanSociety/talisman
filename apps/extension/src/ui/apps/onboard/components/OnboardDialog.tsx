import { classNames } from "@ui/util/cn"
import type { ReactNode } from "react"

type OnboardDialogProps = {
  title?: string
  children: ReactNode
  className?: string
}

export const OnboardDialog = ({ title, children, className }: OnboardDialogProps) => (
  <div className={classNames("flex w-150 flex-col items-center gap-12", className)}>
    <div
      className={classNames(
        "transform-gpu bg-body/5 backdrop-blur-xl",
        "flex w-full flex-col gap-16 rounded-lg p-16 text-left"
      )}
    >
      {title && <div className="text-white text-xl">{title}</div>}
      <div className={`text-body-secondary`}>{children}</div>
    </div>
  </div>
)
