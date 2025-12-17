import { FC } from "react"
import { useTranslation } from "react-i18next"
import { WizardModalDialog } from "talisman-ui"

import { SenderAccountPicker } from "../../shared/SenderAccountPicker"
import { useEarnDepositWizard } from "../context"
import { useEarnDepositModal } from "../useEarnDepositModal"

export const EarnDepositStepAccount: FC = () => {
  const { t } = useTranslation()
  const { close } = useEarnDepositModal()
  const { address, tokenIn, onAccountChanged } = useEarnDepositWizard()

  if (!tokenIn) throw new Error("TokenIn is not defined")

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={t("Select Account")}
      contentClassName="p-0"
      onCloseClick={close}
    >
      <SenderAccountPicker address={address} tokenId={tokenIn?.id} onSelect={onAccountChanged} />
    </WizardModalDialog>
  )
}
