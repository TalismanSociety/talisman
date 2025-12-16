import { FC } from "react"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"

import { SenderAccountPicker } from "../../shared/SenderAccountPicker"
import { useEarnDepositWizard } from "../context"
import { useEarnDepositModal } from "../useEarnDepositModal"

export const EarnDepositStepAccount: FC = () => {
  const { t } = useTranslation()
  const { close } = useEarnDepositModal()
  const { address, tokenIn, onAccountChanged } = useEarnDepositWizard()

  if (!tokenIn) throw new Error("TokenIn is not defined")

  return (
    <ModalDialog
      className="size-full border-none"
      title={t("Select Account")}
      contentClassName="p-0"
      onClose={close}
    >
      <SenderAccountPicker address={address} tokenId={tokenIn?.id} onSelect={onAccountChanged} />
    </ModalDialog>
  )
}
