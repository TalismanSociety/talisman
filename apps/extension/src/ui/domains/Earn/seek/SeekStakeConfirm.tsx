import type { EthNetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import { AlertCircleIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import {
  FormFieldSet,
  FormFieldSetRow,
  FormFieldSetSeparator,
} from "@ui/domains/Earn/shared/FormFieldSet"
import {
  TransactionsStepper,
  type TransactionsStepperStep,
} from "@ui/domains/Earn/shared/TransactionsStepper"
import type { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import type { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { RiskAnalysisPillButton } from "@ui/domains/Sign/risk-analysis/RiskAnalysisPillButton"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import { cn } from "@ui/util/cn"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import {
  NetworkDisplay,
  SEEK_STAKING_MODAL_CONTAINER_ID,
  SeekExpectedRewards,
  SeekNetworkFeeRows,
} from "./SeekStakingModalShared"

export const SeekStakeConfirm: FC<{
  token: Token
  amount: bigint
  address: string
  networkId: EthNetworkId
  apr: number | null | undefined
  ethTx: ReturnType<typeof useEthTransaction>
  feeTokenId?: TokenId
  riskAnalysis: ReturnType<typeof useEvmTransactionRiskAnalysis>
  hasApprovalStep: boolean
  isApproval: boolean
  isProcessing: boolean
  isPreparing: boolean
  onBackClick?: () => void
  onCloseClick: () => void
  onSubmit: (hash: string) => void
}> = ({
  token,
  amount,
  address,
  networkId,
  apr,
  ethTx,
  feeTokenId,
  riskAnalysis,
  hasApprovalStep,
  isApproval,
  isProcessing,
  isPreparing,
  onBackClick,
  onCloseClick,
  onSubmit,
}) => {
  const { t } = useTranslation()

  const steps = useMemo<TransactionsStepperStep[]>(
    () =>
      hasApprovalStep
        ? [
            { key: "approve", label: t("Approve") },
            { key: "stake", label: t("Stake") },
          ]
        : [{ key: "stake", label: t("Stake") }],
    [hasApprovalStep, t]
  )
  const stepIndex = hasApprovalStep && !isApproval ? 1 : 0

  return (
    <RiskAnalysisProvider riskAnalysis={riskAnalysis} containerId={SEEK_STAKING_MODAL_CONTAINER_ID}>
      <WizardModalDialog
        className="size-full border-none"
        title={t("Enter Position")}
        onBackClick={onBackClick}
        onCloseClick={onCloseClick}
      >
        <div className="flex size-full flex-col gap-8 overflow-hidden">
          <div className="line-clamp-2 w-full text-center font-bold text-md">
            {steps.length > 1
              ? t("Approve {{count}} transactions", { count: steps.length })
              : t("Approve transaction")}
          </div>
          <div className="flex w-full grow flex-col items-center justify-center gap-6 overflow-hidden">
            <TransactionsStepper steps={steps} stepIndex={stepIndex} isProcessing={isProcessing} />
            <div>
              <RiskAnalysisPillButton />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "text-center text-brand-orange text-xs",
                    // do not display error while isProcessing=true, as it has already been executed
                    (isProcessing || !ethTx.error) && "invisible"
                  )}
                >
                  <AlertCircleIcon className="inline-block align-text-top text-sm" /> {ethTx.error}
                </div>
              </TooltipTrigger>
              {!!ethTx.errorDetails && <TooltipContent>{ethTx.errorDetails}</TooltipContent>}
            </Tooltip>
          </div>
          <FormFieldSet>
            <FormFieldSetRow label={t("Amount")}>
              <TokensAndFiat withLogo noFiat tokenId={token.id} planck={amount.toString()} />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Account")} valueClassName="h-full">
              <AccountDisplay address={address} />
            </FormFieldSetRow>
            <FormFieldSetSeparator />
            <FormFieldSetRow label={t("DeFi Product")} variant="small">
              {t("SEEK Staking")}
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Provider")} variant="small">
              {t("Talisman")}
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Expected Rewards")} variant="small">
              <SeekExpectedRewards apr={apr} />
            </FormFieldSetRow>
            <FormFieldSetSeparator />
            <FormFieldSetRow label={t("Network")} variant="small">
              <NetworkDisplay networkId={networkId} />
            </FormFieldSetRow>
            <SeekNetworkFeeRows ethTx={ethTx} feeTokenId={feeTokenId} variant="small" />
          </FormFieldSet>
          <TxSubmitButton
            containerId={SEEK_STAKING_MODAL_CONTAINER_ID}
            tx={
              ethTx.transaction
                ? {
                    platform: "ethereum",
                    networkId,
                    payload: ethTx.transaction,
                  }
                : null
            }
            label={`${t("Approve")} (${stepIndex + 1}/${steps.length})`}
            className="w-full"
            disabled={!!ethTx.error || !ethTx.transaction}
            isProcessing={isProcessing || isPreparing}
            onSubmit={onSubmit}
          />
        </div>
      </WizardModalDialog>
    </RiskAnalysisProvider>
  )
}
