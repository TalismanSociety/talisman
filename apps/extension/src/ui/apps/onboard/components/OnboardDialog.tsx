import { classNames } from "@talismn/util"
import { ReactNode } from "react"

import { OnboardProgressBar } from "./OnboardProgressBar"
import { onboardBackgroundClassNames } from "./OnboardStyles"

type OnboardDialogProps = {
  title: string
  children: ReactNode
  className?: string
}

export const OnboardDialog = ({ title, children, className }: OnboardDialogProps) => (
  <div className="flex w-[60rem] flex-col items-center gap-12">
    <div
      className={classNames(className, onboardBackgroundClassNames, "rounded-lg p-24 text-left")}
    >
      <div className="text-xl text-white">{title}</div>
      <div className="text-body-secondary mt-16">{children}</div>
    </div>
    <OnboardProgressBar />
  </div>
)
