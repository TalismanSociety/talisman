import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Modal, ModalDialog } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"

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
    [close, navigate],
  )

  return (
    <Modal isOpen={isOpen} onDismiss={close} containerId="main">
      <ModalDialog
        centerTitle
        title={t("Learn More")}
        onClose={close}
        className="maw-h-[100dvh] h-[60rem] w-[40rem] max-w-[100dvw] sm:h-[85rem] sm:w-[60rem]"
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
