import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { Trans, useTranslation } from "react-i18next"

import { TryTalismanContent } from "./TryTalismanContent"
import { useTryTalismanModal } from "./useTryTalismanModal"

export const TryTalismanModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useTryTalismanModal()

  return (
    <Modal analyticsId="try_talisman" isOpen={isOpen} onDismiss={close} containerId="main">
      <ModalDialog
        title={
          <Trans t={t}>
            Try <span className="text-primary">Talisman</span>
          </Trans>
        }
        onCloseClick={close}
      >
        <ScrollContainer className="h-full w-full">
          <TryTalismanContent />
        </ScrollContainer>
      </ModalDialog>
    </Modal>
  )
}
