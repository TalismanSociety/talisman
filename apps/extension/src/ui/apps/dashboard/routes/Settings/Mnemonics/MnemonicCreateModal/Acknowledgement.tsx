import { Acknowledgement as BaseAcknowledgement } from "@ui/domains/Mnemonic/Acknowledgement"
import { useTranslation } from "react-i18next"

import { Stages, useMnemonicCreateModal } from "./context"
import { MnemonicCreateModalDialog } from "./Dialog"

export const Acknowledgement = () => {
  const { t } = useTranslation("admin")
  const { setStage } = useMnemonicCreateModal()
  return (
    <MnemonicCreateModalDialog title={t("New recovery phrase")}>
      <div className={"flex justify-center"}>
        <BaseAcknowledgement onContinueClick={() => setStage(Stages.Create)} />
      </div>
    </MnemonicCreateModalDialog>
  )
}
