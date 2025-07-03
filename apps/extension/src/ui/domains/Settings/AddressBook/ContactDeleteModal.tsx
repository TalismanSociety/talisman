import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"

import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"

import { ContactModalProps } from "./types"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact delete",
}

export const ContactDeleteModal = ({ contact, isOpen, close }: ContactModalProps) => {
  const { t } = useTranslation()
  useAnalyticsPageView(ANALYTICS_PAGE)

  const handleDelete = useCallback(async () => {
    close()
    if (contact) {
      await api.accountForget(contact.address)
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Interact",
        action: "Delete address book contact",
      })
    }
  }, [close, contact])

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
