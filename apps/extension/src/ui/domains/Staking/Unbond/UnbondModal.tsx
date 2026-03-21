import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { IconButton } from "@ui/components/IconButton"
import { Modal } from "@ui/components/Modal"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { UnbondFollowUp } from "./UnbondFollowUp"
import { UnbondReview } from "./UnbondReview"
import { useUnbondModal } from "./useUnbondModal"
import { useUnbondWizard } from "./useUnbondWizard"

const ModalHeader = () => {
  const { t } = useTranslation()
  const { step } = useUnbondWizard()
  const { close } = useUnbondModal()

  return (
    <div
      className={classNames(
        "flex h-32 w-full shrink-0 items-center justify-between px-10 text-body-secondary",
        step === "follow-up" ? "invisible" : "visible"
      )}
    >
      <div>{step === "review" && t("Unbond")}</div>
      <IconButton onClick={close}>
        <XIcon />
      </IconButton>
    </div>
  )
}

const ModalContent = () => {
  const { step } = useUnbondWizard()

  switch (step) {
    case "review":
      return <UnbondReview />
    case "follow-up":
      return <UnbondFollowUp />
  }
}

const Content = () => (
  <div
    id="StakingModalDialog" // acts as containerId for sub modals
    className={classNames(
      "relative flex h-[37.5rem] max-h-[100dvh] w-[25rem] max-w-[100dvw] flex-col overflow-hidden bg-black",
      !IS_POPUP && "rounded border border-grey-850"
    )}
  >
    <ModalHeader />
    <div className="grow p-12 pt-0">
      <ModalContent />
    </div>
  </div>
)

export const UnbondModal = () => {
  const { isOpen, close } = useUnbondModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="UnbondModal" />}>
        <Content />
      </Suspense>
    </Modal>
  )
}
