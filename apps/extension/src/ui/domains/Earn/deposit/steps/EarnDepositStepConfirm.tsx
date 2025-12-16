import { useTranslation } from "react-i18next"
import { Button, ModalDialog } from "talisman-ui"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { AccountDisplay } from "../../shared/AccountDisplay"
import { FormFieldSet, FormFieldSetRow, FormFieldSetSeparator } from "../../shared/FormFieldSet"
import { useEarnDepositWizard } from "../context"
import { useEarnDepositModal } from "../useEarnDepositModal"

export const EarnDepositStepConfirm = () => {
  const { t } = useTranslation()
  const { close } = useEarnDepositModal()
  const { tokenIn, amountIn, address, network } = useEarnDepositWizard()

  if (!tokenIn || !amountIn || !address) throw new Error("TokenIn is not defined")

  return (
    <ModalDialog className="size-full border-none" title={t("Confirm Deposit")} onClose={close}>
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <div className="text-center text-lg font-bold">Entering Position</div>
        <div className="grow"></div>
        <FormFieldSet>
          <FormFieldSetRow label={t("Amount")}>
            <TokensAndFiat withLogo noFiat tokenId={tokenIn.id} planck={amountIn} />
          </FormFieldSetRow>
          <FormFieldSetRow label={t("Account")} valueClassName="h-full">
            <AccountDisplay
              address={address}
              ss58Format={network?.platform === "polkadot" ? network.prefix : undefined}
            />
          </FormFieldSetRow>
          <FormFieldSetSeparator />
          <FormFieldSetRow label={t("APY")}>12%</FormFieldSetRow>
          <FormFieldSetSeparator />
        </FormFieldSet>
        <Button primary>{t("Submit")}</Button>
      </div>
    </ModalDialog>
  )
}
