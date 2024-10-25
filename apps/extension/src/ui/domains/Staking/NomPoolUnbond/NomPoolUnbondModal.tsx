import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { IS_POPUP } from "@ui/util/constants"

import { NomPoolUnbondFollowUp } from "./NomPoolUnbondFollowUp"
import { NomPoolUnbondReview } from "./NomPoolUnbondReview"
import { useNomPoolUnbondModal } from "./useNomPoolUnbondModal"
import { useNomPoolUnbondWizard } from "./useNomPoolUnbondWizard"

const ModalHeader = () => {
  const { t } = useTranslation()
  const { step } = useNomPoolUnbondWizard()
  const { close } = useNomPoolUnbondModal()

  return (
    <div
      className={classNames(
        "text-body-secondary flex h-32 w-full shrink-0 items-center justify-between px-10",
        step === "follow-up" ? "invisible" : "visible",
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
  const { step } = useNomPoolUnbondWizard()

  switch (step) {
    case "review":
      return <NomPoolUnbondReview />
    case "follow-up":
      return <NomPoolUnbondFollowUp />
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

export const NomPoolUnbondModal = () => {
  const { isOpen, close } = useNomPoolUnbondModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <Suspense fallback={<SuspenseTracker name="NomPoolUnbondModal" />}>
        <Content />
      </Suspense>
    </Modal>
  )
}
