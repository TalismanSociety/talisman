import { MnemonicUnlock } from "@ui/domains/Mnemonic/MnemonicUnlock"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Stages, useMnemonicBackupModal } from "../context"
import { MnemonicBackupModalBase } from "../MnemonicBackupModalBase"
import { Verify } from "./Verify"
import { ViewMnemonic } from "./View"

enum ShowMnemonicStages {
  View = "View",
  Verify = "Verify",
}

export const ShowMnemonic = () => {
  const { t } = useTranslation("admin")
  const { mnemonic, setStage } = useMnemonicBackupModal()
  const [showMnemonicStage, setShowMnemonicStage] = useState<ShowMnemonicStages>(
    ShowMnemonicStages.View
  )
  const title = useMemo(() => {
    switch (showMnemonicStage) {
      case ShowMnemonicStages.View:
        return t("Backup Recovery Phrase")
      case ShowMnemonicStages.Verify:
        return t("Verify Recovery Phrase")
    }
  }, [showMnemonicStage, t])

  if (!mnemonic)
    return <MnemonicBackupModalBase title={"Error"}>No mnemonic available</MnemonicBackupModalBase>

  return (
    <MnemonicBackupModalBase title={title}>
      <div className="min-h-[18.6rem] grow">
        <MnemonicUnlock
          mnemonicId={mnemonic.id}
          buttonText={t("View Recovery Phrase")}
          title={
            <div className="text-body-secondary">
              {t("Enter your password to show your recovery phrase.")}
            </div>
          }
        >
          {showMnemonicStage === ShowMnemonicStages.View && (
            <ViewMnemonic
              mnemonicId={mnemonic.id}
              handleComplete={() => setShowMnemonicStage(ShowMnemonicStages.Verify)}
            />
          )}
          {showMnemonicStage === ShowMnemonicStages.Verify && (
            <Verify
              mnemonicId={mnemonic.id}
              handleComplete={() => setStage(Stages.Complete)}
              handleBack={() => setShowMnemonicStage(ShowMnemonicStages.View)}
            />
          )}
        </MnemonicUnlock>
      </div>
    </MnemonicBackupModalBase>
  )
}
