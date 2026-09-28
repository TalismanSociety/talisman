import { ModalDialog } from "@ui/components/ModalDialog"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { useTranslation } from "react-i18next"

import { AccountDisplay } from "../../../shared/AccountDisplay"
import { FormFieldSetRow, FormFieldSetSeparator } from "../../../shared/FormFieldSet"
import { YieldxyzConfirmBody } from "../../components/YieldxyzConfirm"
import { YieldxyzProductTitleDisplay } from "../../components/YieldxyzProductTitleDisplay"
import { YieldxyzProductYieldDisplay } from "../../components/YieldxyzProductYieldDisplay"
import { YieldxyzProviderDisplay } from "../../components/YieldxyzProviderLogo"
import { useYieldxyzEnterModal } from "../useYieldxyzEnterModal"
import { useYieldxyzEnterWizard } from "../useYieldxyzEnterWizard"

export const YieldxyzEnterStepConfirm = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzEnterModal()
  const wizard = useYieldxyzEnterWizard()
  const { tokenIn, amountIn, address, action, network, product, transaction, canGoBack, goBack } =
    wizard

  if (!tokenIn || !amountIn || !address || !product || !action) return null

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
        className="size-full border-none"
        title={t("Enter Position")}
        onBackClick={canGoBack ? goBack : undefined}
        onCloseClick={close}
      >
        <YieldxyzConfirmBody wizard={wizard} networkId={tokenIn.networkId}>
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
          <FormFieldSetRow label={t("DeFi Product")} variant="small">
            <YieldxyzProductTitleDisplay product={product} />
          </FormFieldSetRow>
          <FormFieldSetRow label={t("Provider")} variant="small">
            <YieldxyzProviderDisplay providerId={product.providerId} />
          </FormFieldSetRow>
          <FormFieldSetRow label={t("Expected Rewards")} variant="small">
            <YieldxyzProductYieldDisplay product={product} />
          </FormFieldSetRow>
        </YieldxyzConfirmBody>
      </ModalDialog>
    </RiskAnalysisProvider>
  )
}
