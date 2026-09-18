import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { TokenRiskDetails } from "./TokenRiskDetails"
import type { TokenRiskScan } from "./tokenRiskScan"

export const TokenRiskModal: FC<{
  scan: TokenRiskScan
  symbol: string
  isOpen: boolean
  onDismiss: () => void
}> = ({ scan, symbol, isOpen, onDismiss }) => {
  const { t } = useTranslation()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onDismiss}>
      <PopupSizeModalContainer id="token-risk-modal">
        <WizardModalDialog
          className="size-full border-none"
          contentClassName="flex flex-col"
          title={t("Token risk scan")}
          onCloseClick={onDismiss}
        >
          <TokenRiskDetails className="grow" scan={scan} symbol={symbol} />
          <Button className="mt-8 w-full shrink-0" onClick={onDismiss}>
            {t("Close")}
          </Button>
        </WizardModalDialog>
      </PopupSizeModalContainer>
    </Modal>
  )
}
