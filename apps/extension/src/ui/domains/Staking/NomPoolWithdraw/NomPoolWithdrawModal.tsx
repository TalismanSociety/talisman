import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { IconButton } from "@ui/components/IconButton"
import { Modal } from "@ui/components/Modal"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { NomPoolWithdrawFollowUp } from "./NomPoolWithdrawFollowUp"
import { NomPoolWithdrawReview } from "./NomPoolWithdrawReview"
import { useNomPoolWithdrawModal } from "./useNomPoolWithdrawModal"
import { useNomPoolWithdrawWizard } from "./useNomPoolWithdrawWizard"

const ModalHeader = () => {
  const { t } = useTranslation()
  const { step } = useNomPoolWithdrawWizard()
  const { close } = useNomPoolWithdrawModal()

  return (
    <div
      className={classNames(
        "flex h-32 w-full shrink-0 items-center justify-between px-10 text-body-secondary",
        step === "follow-up" ? "invisible" : "visible"
      )}
    >
      <div>{step === "review" && t("Withdraw")}</div>
      <IconButton onClick={close}>
        <XIcon />
      </IconButton>
    </div>
  )
}

const ModalContent = () => {
  const { step } = useNomPoolWithdrawWizard()

  switch (step) {
    case "review":
      return <NomPoolWithdrawReview />
    case "follow-up":
      return <NomPoolWithdrawFollowUp />
  }
}

const Content = () => (
  <div
    id="StakingModalDialog" // acts as containerId for sub modals
    className={classNames(
      "relative flex h-[37.5rem] max-h-dvh w-[25rem] max-w-dvw flex-col overflow-hidden bg-black",
      !IS_POPUP && "rounded border border-grey-850"
    )}
  >
    <ModalHeader />
    <div className="grow p-12 pt-0">
      <ModalContent />
    </div>
  </div>
)

export const NomPoolWithdrawModal = () => {
  const { isOpen, close } = useNomPoolWithdrawModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="NomPoolWithdrawModal" />}>
        <Content />
      </Suspense>
    </Modal>
  )
}
