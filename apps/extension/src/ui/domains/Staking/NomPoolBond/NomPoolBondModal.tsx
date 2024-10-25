import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"

import { NomPoolBondFollowUp } from "./NomPoolBondFollowUp"
import { NomPoolBondForm } from "./NomPoolBondForm"
import { NomPoolBondReview } from "./NomPoolBondReview"
import { useNomPoolBondModal } from "./useNomPoolBondModal"
import { useNomPoolBondWizard } from "./useNomPoolBondWizard"

const ModalHeader = () => {
  const { t } = useTranslation()
  const { step, setStep } = useNomPoolBondWizard()
  const { close } = useNomPoolBondModal()

  const handleBackClick = useCallback(() => setStep("form"), [setStep])

  return (
    <div
      className={classNames(
        "text-body-secondary flex h-32 w-full shrink-0 items-center justify-between px-10",
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

const ModalContent = () => {
  const { step } = useNomPoolBondWizard()

  switch (step) {
    case "form":
      return <NomPoolBondForm />
    case "review":
      return <NomPoolBondReview />
    case "follow-up":
      return <NomPoolBondFollowUp />
  }
}

const Content = () => (
  <div
    id="StakingModalDialog" // acts as containerId for sub modals
    className={classNames(
      "relative flex h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
      !IS_POPUP && "border-grey-850 rounded border",
    )}
  >
    <ModalHeader />
    <div className="grow p-12 pt-0">
      <ModalContent />
    </div>
  </div>
)

export const NomPoolBondModal = () => {
  const { isOpen, close } = useNomPoolBondModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="NomPoolBondModal" />}>
        <Content />
      </Suspense>
    </Modal>
  )
}
