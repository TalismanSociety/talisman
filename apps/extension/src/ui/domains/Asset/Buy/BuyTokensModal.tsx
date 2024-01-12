import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

import { BuyTokensForm } from "./BuyTokensForm"
import { useBuyTokensModal } from "./useBuyTokensModal"

// This control is injected directly in the layout of dashboard
export const BuyTokensModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useBuyTokensModal()

  return (
    <Modal isOpen={isOpen} onDismiss={close} className="overflow-visible">
      <ModalDialog
        className="bg-grey-850 border-grey-800 overflow-visible border [&>div]:overflow-visible"
        title={t("Buy Crypto")}
        onClose={close}
      >
        <BuyTokensForm />
      </ModalDialog>
    </Modal>
  )
}
