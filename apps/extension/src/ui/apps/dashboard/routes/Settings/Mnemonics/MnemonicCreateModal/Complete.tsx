import { VerificationComplete } from "@ui/domains/Mnemonic/VerificationComplete"
import { useTranslation } from "react-i18next"

import { useMnemonicCreateModal } from "./context"
import { MnemonicCreateModalDialog } from "./Dialog"

export const Complete = () => {
  const { t } = useTranslation("admin")
  const { complete } = useMnemonicCreateModal()

  return (
    <MnemonicCreateModalDialog title={t("Verification Complete")}>
      <VerificationComplete onComplete={complete} />
    </MnemonicCreateModalDialog>
  )
}
