import { Verify as BaseVerify } from "@ui/domains/Mnemonic/Verify"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { Stages, useMnemonicCreateModal } from "./context"
import { MnemonicCreateModalDialog } from "./Dialog"

export const Verify = () => {
  const { setStage, mnemonic, complete } = useMnemonicCreateModal()
  const { t } = useTranslation("admin")

  const handleComplete = useCallback(() => {
    setStage(Stages.Complete)
  }, [setStage])

  const handleBack = useCallback(() => {
    setStage(Stages.Create)
  }, [setStage])

  return (
    <MnemonicCreateModalDialog title={t("Verify your recovery phrase")}>
      <BaseVerify
        onBack={handleBack}
        onComplete={handleComplete}
        onSkip={complete}
        mnemonic={mnemonic}
      />
    </MnemonicCreateModalDialog>
  )
}
