import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { ModalContent } from "../shared/ModalContent"
import { BondFollowUp } from "./BondFollowUp"
import { BondForm } from "./BondForm"
import { BondReview } from "./BondReview"
import { useBondModal } from "./hooks/useBondModal"
import { useBondWizard } from "./hooks/useBondWizard"

const ModalHeader = () => {
  const { t } = useTranslation()
  const { step, setStep } = useBondWizard()
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
