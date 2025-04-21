import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"

import { BittensorBondDelegateSelect } from "../Bittensor/BittensorBondDelegateSelect"
import { ModalContent } from "../shared/ModalContent"
import { BondFollowUp } from "./BondFollowUp"
import { BondForm } from "./BondForm"
import { BondReview } from "./BondReview"
import { useBondModal } from "./hooks/useBondModal"
import { useBondWizard } from "./hooks/useBondWizard"

const ModalHeader = () => {
  const { t } = useTranslation()
  const { step, setStep, token } = useBondWizard()
  const { close } = useBondModal()

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

const ModalBody = () => {
  const { step } = useBondWizard()

  switch (step) {
    // TODO: remove select from switch case and bondWizard hook step
    case "select":
      return <BittensorBondDelegateSelect />
    case "form":
      return <BondForm />
    case "review":
      return <BondReview />
    case "follow-up":
      return <BondFollowUp />
  }
}

export const BondModal = () => {
  const { isOpen, close } = useBondModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="NomPoolBondModal" />}>
        <ModalContent ModalHeader={ModalHeader} ModalBody={ModalBody} />
      </Suspense>
    </Modal>
  )
}
