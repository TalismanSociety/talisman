import { ModalDialog } from "@ui/components/ModalDialog"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { useTranslation } from "react-i18next"

import { AccountDisplay } from "../../../shared/AccountDisplay"
import { FormFieldSetRow, FormFieldSetSeparator } from "../../../shared/FormFieldSet"
import { YieldxyzConfirmBody } from "../../components/YieldxyzConfirm"
import { YieldxyzProductTitleDisplay } from "../../components/YieldxyzProductTitleDisplay"
import { YieldxyzProductYieldDisplay } from "../../components/YieldxyzProductYieldDisplay"
import { YieldxyzProviderDisplay } from "../../components/YieldxyzProviderLogo"
import { YieldxyzTokensAndFiat } from "../../components/YieldxyzTokensAndFiat"
import { useYieldxyzExitModal } from "../useYieldxyzExitModal"
import { useYieldxyzExitWizard } from "../useYieldxyzExitWizard"

export const YieldxyzExitStepConfirm = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzExitModal()
  const wizard = useYieldxyzExitWizard()
  const { position, action, network, transaction, amountOut, goTo } = wizard

  if (!position || !action || !amountOut) return null

  return (
    <RiskAnalysisProvider
      riskAnalysis={
        transaction?.platform === "ethereum" || transaction?.platform === "solana"
          ? transaction.riskAnalysis
          : undefined
      }
      containerId="earn-modal"
    >
      <ModalDialog
        variant="wizard"
        className="size-full border-none"
        title={t("Exit Position")}
        onBackClick={() => goTo("amount")}
        onCloseClick={close}
      >
        <YieldxyzConfirmBody wizard={wizard} networkId={position.networkId}>
          <FormFieldSetRow label={t("Amount")}>
            <YieldxyzTokensAndFiat
              withLogo
              token={position.product.token}
              amountRaw={amountOut}
              className="text-body-secondary"
              tokensClassName="text-body"
            />
          </FormFieldSetRow>
          <FormFieldSetRow label={t("Account")} valueClassName="h-full">
            <AccountDisplay
              address={position.address}
              ss58Format={network?.platform === "polkadot" ? network.prefix : undefined}
            />
          </FormFieldSetRow>
          <FormFieldSetSeparator />
          <FormFieldSetRow label={t("DeFi Product")} variant="small">
            <YieldxyzProductTitleDisplay product={position.product} />
          </FormFieldSetRow>
          <FormFieldSetRow label={t("Provider")} variant="small">
            <YieldxyzProviderDisplay providerId={position.product.providerId} />
          </FormFieldSetRow>
          <FormFieldSetRow label={t("Expected Rewards")} variant="small">
            <YieldxyzProductYieldDisplay product={position.product} />
          </FormFieldSetRow>
        </YieldxyzConfirmBody>
      </ModalDialog>
    </RiskAnalysisProvider>
  )
}
