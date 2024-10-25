import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { useOnboard } from "../context"

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
  const { t } = useTranslation("onboard")
  return (
    <span className="flex w-full grow justify-end">
      <button
        onClick={() => onDoItLaterClick()}
        className="text-body-secondary flex items-center gap-2 align-middle"
      >
        {t("I'll do it later")} <ArrowRightIcon />
      </button>
    </span>
  )
}

type OnboardDialogProps = {
  title?: string
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
    <div
      className={classNames(
        "bg-body/5 transform-gpu backdrop-blur-xl",
        "flex w-full flex-col gap-16 rounded-lg p-16 text-left",
      )}
    >
      {title && <div className="text-xl text-white">{title}</div>}
      <div className={`text-body-secondary`}>{children}</div>
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
