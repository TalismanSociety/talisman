import type { AnalyticsPage } from "@ui/api/analytics"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
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
      <WizardModalDialog
        title={
          <Trans t={t}>
            Try <span className="text-primary">Talisman</span>
          </Trans>
        }
        onCloseClick={close}
      >
        <ScrollContainer className="h-full w-full">
          <TryTalismanContent analytics={ANALYTICS_PAGE} />
        </ScrollContainer>
      </WizardModalDialog>
    </Modal>
  )
}
