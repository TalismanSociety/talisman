import { ScrollContainer } from "@talisman/components/ScrollContainer"
import type { AnalyticsPage } from "@ui/api/analytics"
import { Modal } from "@ui/talisman-ui/components/Modal"
import { ModalDialog } from "@ui/talisman-ui/components/ModalDialog"
import { Trans, useTranslation } from "react-i18next"

import { TryTalismanContent } from "./TryTalismanContent"
import { useTryTalismanModal } from "./useTryTalismanModal"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Try Talisman",
}

export const TryTalismanModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useTryTalismanModal()

  return (
    <Modal isOpen={isOpen} onDismiss={close} containerId="main">
      <ModalDialog
        centerTitle
        title={
          <Trans t={t}>
            Try <span className="text-primary">Talisman</span>
          </Trans>
        }
        onClose={close}
        className="h-[60rem] w-[40rem]"
      >
        <ScrollContainer className="h-full w-full">
          <TryTalismanContent analytics={ANALYTICS_PAGE} />
        </ScrollContainer>
      </ModalDialog>
    </Modal>
  )
}
