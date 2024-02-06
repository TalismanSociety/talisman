import { MnemonicUnlock } from "@ui/domains/Mnemonic/MnemonicUnlock"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Stages, useMnemonicBackupModal } from "../context"
import { MnemonicBackupModalBase } from "../MnemonicBackupModalBase"
import { Verify } from "./Verify"
import { ViewMnemonic } from "./View"

export const ShowMnemonic = () => {
  const { t } = useTranslation("admin")
  const { mnemonic, stage, setStage } = useMnemonicBackupModal()

  const title = useMemo(() => {
    switch (stage) {
      case Stages.Verify:
        return t("Verify Recovery Phrase")
      case Stages.Show:
      default:
        return t("Backup Recovery Phrase")
    }
  }, [stage, t])

  if (!mnemonic)
    return (
      <MnemonicBackupModalBase title={"Error"}>
        {t("No mnemonic available")}
      </MnemonicBackupModalBase>
    )

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
          {stage === Stages.Show && <ViewMnemonic handleComplete={() => setStage(Stages.Verify)} />}
          {stage === Stages.Verify && <Verify />}
        </MnemonicUnlock>
      </div>
    </MnemonicBackupModalBase>
  )
}
