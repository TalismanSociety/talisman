import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

// TODO: Remove all non Bittensor related code
export const BittensorModalHeader = () => {
  const { t } = useTranslation()
  const { step, stakeType, setStep, stakeDirection } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()

  const handleBackClick = useCallback(
    () => setStep(stakeType === "root" ? "form" : "subnet-form"),
    [setStep, stakeType],
  )

  return (
    <div
      className={classNames(
        "text-body-secondary flex min-h-32 w-full shrink-0 items-center justify-between px-10",
        step === "follow-up" ? "invisible" : "visible",
      )}
    >
      <IconButton
        onClick={handleBackClick}
        className={classNames(step.includes("review") ? "block" : "hidden")}
      >
        <ChevronLeftIcon />
      </IconButton>
      <div>
        {step.includes("form") && (
          <span className="text-body font-bold">
            {stakeDirection === "bond" ? t("Staking") : t("Unstake")}
          </span>
        )}
        {step.includes("review") && t("Confirm")}
        {step.includes("select") && (
          <div className="flex items-center gap-2 space-y-4">
            <IconButton onClick={handleBackClick}>
              <ChevronLeftIcon />
            </IconButton>
            <div>
              <div className="font-bold text-white">
                {step === "select" ? t("Select Validator") : t("Select Subnet")}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="bg-body-disabled inline-block size-2 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>
      <IconButton onClick={close}>
        <XIcon />
      </IconButton>
    </div>
  )
}
