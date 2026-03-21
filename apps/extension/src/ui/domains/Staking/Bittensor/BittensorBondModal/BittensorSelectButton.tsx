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
        className={"my-[0.2813rem] h-8 w-40 animate-pulse rounded-xs bg-grey-700 text-grey-700"}
      />
    )

  return (
    <button
      type="button"
      onClick={handleClick}
      className={classNames(
        "flex cursor-pointer items-center gap-2 rounded-xl bg-pill px-4 py-2 font-light text-xs hover:bg-grey-700",
        isBtnDisabled && "cursor-not-allowed opacity-50"
      )}
    >
      <SettingsIcon className="text-body-secondary" />
      <div>{label}</div>
    </button>
  )
}
