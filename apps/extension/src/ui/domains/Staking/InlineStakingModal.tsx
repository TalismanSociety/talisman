import { useTranslation } from "react-i18next"
import { Modal, ModalDialog } from "talisman-ui"

import { InlineStakingForm } from "./InlineStakingForm"
import { useInlineStakingModal } from "./useInlineStakingModal"

export const InlineStakingModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useInlineStakingModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog
        id="inlineStakingModalDialog"
        title={t("Staking")}
        className="relative h-[60rem] w-[40rem]"
        onClose={close}
      >
        <InlineStakingForm />
      </ModalDialog>
    </Modal>
  )
}
