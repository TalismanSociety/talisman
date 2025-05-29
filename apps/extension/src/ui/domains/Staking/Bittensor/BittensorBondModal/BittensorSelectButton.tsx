import { SettingsIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useMemo } from "react"

import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

type BittensorSelectButtonProps = {
  isLoading?: boolean
  isDisabled?: boolean
  label: string
  nextStep: "select" | "select-subnet"
}

export const BittensorSelectButton = ({
  isLoading,
  isDisabled,
  label,
  nextStep,
}: BittensorSelectButtonProps) => {
  const { setStep, step, stakeDirection } = useBittensorBondWizard()

  const isBtnDisabled = useMemo(
    () => isDisabled || !step.includes("form") || stakeDirection === "unbond",
    [stakeDirection, step, isDisabled],
  )

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
      onClick={() => !isBtnDisabled && setStep(nextStep)}
      className={classNames(
        "bg-pill hover:bg-grey-700 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-light",
        isBtnDisabled && "cursor-not-allowed",
      )}
    >
      <SettingsIcon className="text-body-secondary" />
      <div>{label}</div>
    </button>
  )
}
