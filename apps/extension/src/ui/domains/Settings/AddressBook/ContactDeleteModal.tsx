import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Button, Modal } from "talisman-ui"

import { ContactModalProps } from "./types"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact delete",
}

export const ContactDeleteModal = ({ contact, isOpen, close }: ContactModalProps) => {
  const { t } = useTranslation("admin")
  const { deleteContact } = useAddressBook()
  useAnalyticsPageView(ANALYTICS_PAGE)

  const handleDelete = useCallback(() => {
    close()
    if (contact) {
      deleteContact(contact)
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Interact",
        action: "Delete address book contact",
      })
    }
  }, [close, contact, deleteContact])

  const contactName = contact?.name || ""

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Delete contact")}>
        <div className="text-body-secondary my-12">
          <Trans t={t}>
            You are deleting contact '<span className="font-bold text-white">{contactName}</span>'
            from your address book.
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
