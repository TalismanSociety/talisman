import { ModalDialog } from "@talisman/components/ModalDialog"
import { useTranslation } from "react-i18next"
import { Modal } from "talisman-ui"

import { BuyTokensForm } from "./BuyTokensForm"
import { useBuyTokensModal } from "./BuyTokensModalContext"

// This control is injected directly in the layout of dashboard
export const BuyTokensModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useBuyTokensModal()

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <ModalDialog
        className="!bg-grey-850 !overflow-visible [&>.content]:!overflow-visible"
        title={t("Buy Crypto")}
        onClose={close}
      >
        <BuyTokensForm />
      </ModalDialog>
    </Modal>
  )
}
