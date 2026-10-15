import { VerificationComplete } from "@ui/domains/Mnemonic/VerificationComplete"
import { useMarkOverlayCompleted } from "@ui/hooks/analytics/useOverlayAnalytics"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { useMnemonicCreateModal } from "./context"
import { MnemonicCreateModalDialog } from "./Dialog"

export const Complete = () => {
  const { t } = useTranslation()
  const { complete } = useMnemonicCreateModal()
  const markOverlayCompleted = useMarkOverlayCompleted()

  const handleComplete = useCallback(() => {
    markOverlayCompleted()
    complete()
  }, [markOverlayCompleted, complete])

  return (
    <MnemonicCreateModalDialog title={t("Verification Complete")}>
      <VerificationComplete onComplete={handleComplete} />
    </MnemonicCreateModalDialog>
  )
}
