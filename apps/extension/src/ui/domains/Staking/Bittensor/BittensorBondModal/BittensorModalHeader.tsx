import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

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
        "text-body-secondary flex min-h-32 w-full shrink-0 items-center px-10",
        step === "follow-up" ? "invisible" : "visible",
      )}
    >
      <IconButton
        onClick={handleBackClick}
        className={classNames(
          step.includes("review") || step.includes("select") ? "block" : "hidden",
        )}
      >
        <ChevronLeftIcon />
      </IconButton>
      <div>
        {step.includes("form") && (
          <span className="text-body font-bold">
            {stakeDirection === "bond" ? t("Staking") : t("Unstake")}
          </span>
        )}
        {step.includes("review") && <div className="font-bold text-white">{t("Confirm")}</div>}
        {step.includes("select") && (
          <div className="font-bold text-white">
            {step === "select" ? t("Select Validator") : t("Select Subnet")}
          </div>
        )}
      </div>
      <IconButton onClick={close} className="ml-auto">
        <XIcon />
      </IconButton>
    </div>
  )
}
