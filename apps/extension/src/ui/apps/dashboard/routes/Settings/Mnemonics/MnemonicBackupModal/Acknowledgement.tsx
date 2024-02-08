import { Acknowledgement as BaseAcknowledgement } from "@ui/domains/Mnemonic/Acknowledgement"
import { useTranslation } from "react-i18next"

import { Stages, useMnemonicBackupModal } from "./context"
import { MnemonicBackupModalBase } from "./MnemonicBackupModalBase"

export const Acknowledgement = () => {
  const { t } = useTranslation("admin")
  const { setStage } = useMnemonicBackupModal()

  return (
    <MnemonicBackupModalBase title={t("Before you get started")} className="!w-[56rem]">
      <BaseAcknowledgement
        onContinueClick={() => {
          setStage(Stages.Show)
        }}
      />
    </MnemonicBackupModalBase>
  )
}
