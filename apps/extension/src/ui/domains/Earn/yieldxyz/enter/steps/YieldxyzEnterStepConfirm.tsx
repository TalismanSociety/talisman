import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { useTranslation } from "react-i18next"

import { AccountDisplay } from "../../../shared/AccountDisplay"
import { FormFieldSet, FormFieldSetRow, FormFieldSetSeparator } from "../../../shared/FormFieldSet"
import {
  YieldxyzConfirmNetworkRows,
  YieldxyzConfirmSubmitButton,
  YieldxyzStepsProgress,
  YieldxyzTransactionError,
} from "../../components/YieldxyzConfirm"
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
      <WizardModalDialog
        className="size-full border-none"
        title={t("Enter Position")}
        onBackClick={canGoBack ? goBack : undefined}
        onCloseClick={close}
      >
        <div className="flex size-full flex-col gap-8 overflow-hidden">
          <ScrollContainer className="w-full grow" innerClassName="flex flex-col gap-8 *:shrink-0">
            <div className="line-clamp-2 w-full text-center font-bold text-md">
              {action.transactions.length > 1
                ? t("Approve {{count}} transactions", { count: action.transactions.length })
                : t("Approve transaction")}
            </div>
            <div className="flex w-full grow flex-col items-center justify-center gap-6">
              <YieldxyzStepsProgress wizard={wizard} />
              <YieldxyzTransactionError wizard={wizard} />
            </div>
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
              <FormFieldSetRow label={t("DeFi Product")} variant="small">
                <YieldxyzProductTitleDisplay product={product} />
              </FormFieldSetRow>
              <FormFieldSetRow label={t("Provider")} variant="small">
                <YieldxyzProviderDisplay providerId={product.providerId} />
              </FormFieldSetRow>
              <FormFieldSetRow label={t("Expected Rewards")} variant="small">
                <YieldxyzProductYieldDisplay product={product} />
              </FormFieldSetRow>
              <FormFieldSetSeparator />
              <YieldxyzConfirmNetworkRows wizard={wizard} networkId={tokenIn.networkId} />
            </FormFieldSet>
          </ScrollContainer>
          <YieldxyzConfirmSubmitButton wizard={wizard} />
        </div>
      </WizardModalDialog>
    </RiskAnalysisProvider>
  )
}
