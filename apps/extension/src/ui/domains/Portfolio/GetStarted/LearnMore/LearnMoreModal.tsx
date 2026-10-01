import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { LearnMoreContent } from "./LearnMoreContent"
import { useLearnMoreModal } from "./useLearnMoreModal"

export const LearnMoreModal = () => {
  const { t } = useTranslation()
  const { isOpen, close } = useLearnMoreModal()

  const navigate = useNavigate()

  const goTo = useCallback(
    (path: string) => () => {
      close()
      navigate(path)
    },
    [close, navigate]
  )

  return (
    <Modal isOpen={isOpen} onDismiss={close} containerId="main">
      <ModalDialog
        title={t("Learn More")}
        onCloseClick={close}
        className="max-w-dvw sm:h-212.5 sm:w-150"
      >
        <ScrollContainer className="h-full w-full">
          <LearnMoreContent
            onAddHardwareClick={goTo("/accounts/add?methodType=connect")}
            onCurrenciesClick={goTo("/settings/general/currency")}
            onManageAccountsClick={goTo("/settings/accounts")}
            onMnemonicsClick={goTo("/settings/mnemonics")}
          />
        </ScrollContainer>
      </ModalDialog>
    </Modal>
  )
}
