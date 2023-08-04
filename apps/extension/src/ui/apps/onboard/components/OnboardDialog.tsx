import { ArrowRightIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { ReactNode } from "react"

import { useOnboard } from "../context"
import { onboardBackgroundClassNames } from "./OnboardStyles"

export const OnboardProgressBar = ({ stages = 3 }: { stages?: number }) => {
  const { stage } = useOnboard()

  if (!stage) return null
  return (
    <div className="flex w-[24rem] justify-center gap-8 text-center">
      {Array.from({ length: stages }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-36 rounded-lg bg-white ${stage !== i + 1 && "bg-opacity-[0.15]"}`}
        />
      ))}
    </div>
  )
}

const DoItLaterButton = ({ onDoItLaterClick }: { onDoItLaterClick: () => void }) => {
  return (
    <span className="flex w-full grow justify-end">
      <button
        onClick={() => onDoItLaterClick()}
        className="text-body-secondary flex items-center gap-2 align-middle"
      >
        I'll do it later <ArrowRightIcon />
      </button>
    </span>
  )
}

type OnboardDialogProps = {
  title: string
  children: ReactNode
  onDoItLaterClick?: () => void
  className?: string
}

export const OnboardDialog = ({
  title,
  children,
  className,
  onDoItLaterClick,
}: OnboardDialogProps) => (
  <div className={classNames("flex w-[60rem] flex-col items-center gap-12", className)}>
    <div className={classNames(onboardBackgroundClassNames, "rounded-lg p-24 text-left")}>
      <div className="text-xl text-white">{title}</div>
      <div className="text-body-secondary mt-16">{children}</div>
    </div>
    {onDoItLaterClick && (
      <div className="grid w-full grid-cols-3 items-center">
        <div>&nbsp;</div>
        <div className="flex justify-center">
          <OnboardProgressBar />
        </div>
        <div>
          <DoItLaterButton {...{ onDoItLaterClick }} />
        </div>
      </div>
    )}
    {!onDoItLaterClick && (
      <div className="flex w-full justify-center">
        <OnboardProgressBar />
      </div>
    )}
  </div>
)
