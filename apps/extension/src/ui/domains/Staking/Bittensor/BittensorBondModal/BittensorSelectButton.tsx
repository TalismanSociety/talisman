import { SettingsIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"

import { type FC, useCallback, useMemo } from "react"

import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

export const BittensorSelectButton: FC<{
  isLoading?: boolean
  isDisabled?: boolean
  label: string
  nextStep: "select-delegate" | "select-subnet"
  className?: string
}> = ({ isLoading, isDisabled, label, nextStep, className }) => {
  const { setStep, step, stakeDirection } = useBittensorBondWizard()

  const isBtnDisabled = useMemo(() => isDisabled || !step.includes("form"), [step, isDisabled])

  const handleClick = useCallback(() => {
    if (isBtnDisabled) return
    if (stakeDirection === "unbond") setStep("select-position")
    else setStep(nextStep)
  }, [isBtnDisabled, nextStep, setStep, stakeDirection])

  if (isLoading)
    return (
      <div
        className={"my-[0.2813rem] h-8 w-40 animate-pulse rounded-xs bg-grey-700 text-grey-700"}
      />
    )

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex max-w-full cursor-pointer items-center gap-2 overflow-hidden rounded-xl bg-pill px-4 py-2 font-light text-xs hover:bg-grey-700",
        className,
        isBtnDisabled && "cursor-not-allowed opacity-50"
      )}
    >
      <SettingsIcon className="shrink-0 text-body-secondary" />
      <div className="truncate">{label}</div>
    </button>
  )
}
