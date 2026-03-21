import { type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { LearnMoreContent } from "./LearnMoreContent"
import { useLearnMoreModal } from "./useLearnMoreModal"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Learn More",
}

export const LearnMoreModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useLearnMoreModal()

  const navigate = useNavigate()

  const goTo = useCallback(
    (action: string, path: string) => () => {
      close()
      sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action })
      navigate(path)
    },
    [close, navigate]
  )

  return (
    <Modal isOpen={isOpen} onDismiss={close} containerId="main">
      <ModalDialog
        centerTitle
        title={t("Learn More")}
        onClose={close}
        className="maw-h-[100dvh] h-150 w-100 max-w-dvw sm:h-212.5 sm:w-150"
      >
        <ScrollContainer className="h-full w-full">
          <LearnMoreContent
            onAddHardwareClick={goTo("Add hardware accounts", "/accounts/add?methodType=connect")}
            onCurrenciesClick={goTo("Change currencies", "/settings/general/currency")}
            onManageAccountsClick={goTo("Manage accounts", "/settings/accounts")}
            onMnemonicsClick={goTo("Manage mnemonics", "/settings/mnemonics")}
          />
        </ScrollContainer>
      </ModalDialog>
    </Modal>
  )
}
