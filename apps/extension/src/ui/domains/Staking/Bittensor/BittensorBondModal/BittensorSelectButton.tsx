import { SettingsIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback, useMemo } from "react"

import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

type BittensorSelectButtonProps = {
  isLoading?: boolean
  isDisabled?: boolean
  label: string
  nextStep: "select-delegate" | "select-subnet"
}

export const BittensorSelectButton = ({
  isLoading,
  isDisabled,
  label,
  nextStep,
}: BittensorSelectButtonProps) => {
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
        className={
          "text-grey-700 bg-grey-700 rounded-xs my-[0.45rem] h-[1.6rem] w-40 animate-pulse"
        }
      />
    )

  return (
    <button
      onClick={handleClick}
      className={classNames(
        "bg-pill hover:bg-grey-700 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-light",
        isBtnDisabled && "cursor-not-allowed opacity-50",
      )}
    >
      <SettingsIcon className="text-body-secondary" />
      <div>{label}</div>
    </button>
  )
}
