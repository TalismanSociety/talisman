import { FC } from "react"
import { useTranslation } from "react-i18next"
import { WizardModalDialog } from "talisman-ui"

import { SenderAccountPicker } from "../../../shared/SenderAccountPicker"
import { useYieldxyzEnterModal } from "../useYieldxyzEnterModal"
import { useYieldxyzEnterWizard } from "../useYieldxyzEnterWizard"

export const YieldxyzEnterStepAccount: FC = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzEnterModal()
  const { address, tokenIn, onAccountChanged } = useYieldxyzEnterWizard()

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
