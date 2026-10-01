import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"

import type { ContactModalProps } from "./types"

export const ContactDeleteModal = ({ contact, isOpen, close }: ContactModalProps) => {
  const { t } = useTranslation()

  const handleDelete = useCallback(async () => {
    close()
    if (contact) {
      await api.accountForget(contact.address)
    }
  }, [close, contact])

  const contactName = contact?.name || ""

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <ModalDialog className="h-auto" title={t("Delete contact")}>
        <div className="my-12 text-body-secondary">
          <Trans values={{ contactName }} t={t}>
            You are deleting contact '
            <span className="font-bold text-white">{"{{contactName}}"}</span>' from your address
            book.
          </Trans>
        </div>
        <div className="flex items-stretch gap-4 pt-4">
          <Button fullWidth onClick={close}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleDelete} fullWidth primary>
            {t("Confirm")}
          </Button>
        </div>
      </ModalDialog>
    </Modal>
  )
}
