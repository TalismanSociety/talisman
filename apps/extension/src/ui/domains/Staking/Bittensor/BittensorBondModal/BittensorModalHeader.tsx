import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"

import { useBittensorBondModal } from "../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

// TODO: Remove all non Bittensor related code
export const BittensorModalHeader = () => {
  const { t } = useTranslation()
  const { step, setStep, token } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()

  const handleBackClick = useCallback(() => setStep("form"), [setStep])

  return (
    <div
      className={classNames(
        "text-body-secondary flex min-h-32 w-full shrink-0 items-center justify-between px-10",
        step === "follow-up" ? "invisible" : "visible",
      )}
    >
      <IconButton
        onClick={handleBackClick}
        className={classNames(step === "review" ? "block" : "hidden")}
      >
        <ChevronLeftIcon />
      </IconButton>
      <div>
        {step === "form" && <span className="text-body font-bold">{t("Staking")}</span>}
        {step === "review" && t("Confirm")}
        {step === "select" && (
          <div className="flex items-center gap-2 space-y-4">
            <IconButton onClick={handleBackClick}>
              <ChevronLeftIcon />
            </IconButton>
            <div>
              <div className="font-bold text-white">{t("Select Validator")}</div>
              <div className="flex items-center gap-2 text-xs">
                <TokenLogo tokenId={token?.id ?? ""} className="text-md shrink-0" />
                <div className="text-white">{token?.symbol}</div>
                <div className="bg-body-disabled inline-block size-2 rounded-full" />
                <div className="text-body-secondary">{t("Delegated Staking")}</div>
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
