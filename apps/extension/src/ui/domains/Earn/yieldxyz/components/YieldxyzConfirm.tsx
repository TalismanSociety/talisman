import type { ActionDto } from "@core/domains/earn/exports"
import type { Network, NetworkId } from "@talismn/chaindata-provider"
import { AlertCircleIcon } from "@talismn/icons"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import {
  RiskAnalysisPillButton,
  useShowRiskAnalysisPillButton,
} from "@ui/domains/Sign/risk-analysis/RiskAnalysisPillButton"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSubmitButton"
import type { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import { cn } from "@ui/util/cn"
import { type FC, type ReactNode, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { TransactionRequest } from "viem"

import { FormFieldSet, FormFieldSetRow, FormFieldSetSeparator } from "../../shared/FormFieldSet"
import type { useYieldxyzTransaction } from "../hooks/useYieldxyzTransaction"
import { YieldxyzTransactionDetails } from "./YieldxyzTransactionDetails"
import { YieldxyzTransactionsStepper } from "./YieldxyzTransactionsStepper"

/** the part of the enter, exit and manage wizards that the confirm step reads */
export type YieldxyzConfirmWizard = {
  action: ActionDto | null | undefined
  network: Network | null | undefined
  transaction: ReturnType<typeof useYieldxyzTransaction>
  stepIndex: number | null
  isProcessing: boolean
  onSubmit: (txId: string) => Promise<void>
  onSubmitError: (cause: unknown) => void
}

export const YieldxyzConfirmBody: FC<{
  wizard: YieldxyzConfirmWizard
  networkId: NetworkId
  children: ReactNode
}> = ({ wizard, networkId, children }) => {
  const { t } = useTranslation()
  const transactionsCount = wizard.action?.transactions.length ?? 0

  return (
    <div className="flex size-full flex-col gap-8 overflow-hidden">
      <ScrollContainer className="w-full grow" innerClassName="flex flex-col gap-8 *:shrink-0">
        <div className="line-clamp-2 w-full text-center font-bold text-md">
          {transactionsCount > 1
            ? t("Approve {{count}} transactions", { count: transactionsCount })
            : t("Approve transaction")}
        </div>
        <div className="flex w-full grow flex-col items-center justify-center gap-6">
          <StepsProgress wizard={wizard} />
          <TransactionError wizard={wizard} />
        </div>
        <FormFieldSet>
          {children}
          <FormFieldSetSeparator />
          <FormFieldSetRow label={t("Network")} variant="small">
            <NetworkDisplay networkId={networkId} />
          </FormFieldSetRow>
          <TransactionDetails transaction={wizard.transaction} />
          <NetworkFeeRow wizard={wizard} />
          <SimulationRow />
        </FormFieldSet>
      </ScrollContainer>
      <SubmitButton wizard={wizard} />
    </div>
  )
}

const SimulationRow = () => {
  const { t } = useTranslation()
  const showRiskAnalysis = useShowRiskAnalysisPillButton()

  if (!showRiskAnalysis) return null

  return (
    <FormFieldSetRow label={t("Risk Assessment")} variant="small">
      <RiskAnalysisPillButton className="h-10" size="xs" />
    </FormFieldSetRow>
  )
}

const TransactionError: FC<{ wizard: YieldxyzConfirmWizard }> = ({
  wizard: { transaction, isProcessing },
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "text-center text-brand-orange text-xs",
            // do not display error while isProcessing=true, as it has already has been executed
            (isProcessing || !transaction?.error) && "invisible"
          )}
        >
          <AlertCircleIcon className="inline-block align-text-top text-sm" /> {transaction?.error}
        </div>
      </TooltipTrigger>
      {!!transaction?.errorDetails && <TooltipContent>{transaction?.errorDetails}</TooltipContent>}
    </Tooltip>
  )
}

const StepsProgress: FC<{ wizard: YieldxyzConfirmWizard }> = ({
  wizard: { action, stepIndex, isProcessing },
}) => {
  if (!action || stepIndex === null) return null

  return (
    <YieldxyzTransactionsStepper
      transactions={action.transactions}
      stepIndex={stepIndex}
      isProcessing={isProcessing}
    />
  )
}

const SubmitButton: FC<{ wizard: YieldxyzConfirmWizard }> = ({
  wizard: { transaction, isProcessing, onSubmit, onSubmitError, stepIndex: txIndex, action },
}) => {
  const { t } = useTranslation()

  const tx = useMemo<TxSubmitButtonTransaction | null>(() => {
    if (!transaction?.transaction) return null
    switch (transaction.platform) {
      case "ethereum":
        return {
          platform: "ethereum",
          payload: transaction.transaction as TransactionRequest,
          networkId: transaction.networkId,
        }
      case "solana":
        return {
          platform: "solana",
          payload: transaction.transaction,
          networkId: transaction.networkId,
        }
      default:
        return null
    }
  }, [transaction])

  return (
    <TxSubmitButton
      containerId="earn-modal"
      tx={tx}
      label={`${t("Approve")} (${(txIndex ?? 0) + 1}/${action?.transactions.length ?? "?"})`}
      className="w-full"
      onSubmit={onSubmit}
      onError={onSubmitError}
      disabled={!tx}
      isProcessing={isProcessing}
    />
  )
}

const NetworkDisplay: FC<{ networkId: NetworkId }> = ({ networkId }) => (
  <div className="flex w-full items-center gap-2 overflow-hidden text-body">
    <NetworkLogo className="size-8" networkId={networkId} />
    <NetworkName className="truncate" networkId={networkId} />
  </div>
)

const TransactionDetails: FC<{ transaction: YieldxyzConfirmWizard["transaction"] }> = ({
  transaction,
}) => {
  if (transaction?.platform !== "ethereum") return null

  return (
    <YieldxyzTransactionDetails
      tx={transaction.transaction}
      feeTokenId={transaction.feeTokenId}
      networkId={transaction.networkId}
    />
  )
}

const NetworkFeeRow: FC<{ wizard: YieldxyzConfirmWizard }> = ({ wizard }) => {
  switch (wizard.network?.platform) {
    case "ethereum":
      return <NetworkFeeRowEth transaction={wizard.transaction} />
    case "solana":
      return <NetworkFeeRowSol transaction={wizard.transaction} />
    default:
      return null
  }
}

const NetworkFeeRowEth: FC<{ transaction: YieldxyzConfirmWizard["transaction"] }> = ({
  transaction,
}) => {
  const { t } = useTranslation()

  // keep the latest valid tx in state so we still have content to display after tx is submitted.
  // without this we'd be getting a lot of flickering and bad UX
  const [ethTx, setEthTx] = useState(transaction?.platform === "ethereum" ? transaction : null)
  useEffect(() => {
    if (transaction?.platform === "ethereum" && transaction.transaction && transaction.txDetails)
      setEthTx(transaction)
  }, [transaction])

  return (
    <>
      <FormFieldSetRow label={t("Transaction Priority")} variant="small">
        {!!ethTx?.transaction && !!ethTx.txDetails && (
          <EthFeeSelect
            key={ethTx.transaction.nonce} // reset internal state when tx changes
            tokenId={ethTx.feeTokenId}
            drawerContainerId="earn-modal"
            gasSettingsByPriority={ethTx.gasSettingsByPriority}
            priority={ethTx.priority}
            txDetails={ethTx.txDetails}
            networkUsage={ethTx.networkUsage}
            tx={ethTx.transaction}
            setCustomSettings={ethTx.setCustomSettings}
            onChange={ethTx.setPriority}
            className="h-10"
          />
        )}
      </FormFieldSetRow>
      <FormFieldSetRow
        label={t("Network Fee")}
        variant="small"
        valueClassName="text-body-secondary"
      >
        {!!ethTx?.txDetails && (
          <TokensAndFiat
            planck={ethTx.txDetails.estimatedFee.toString()}
            tokenId={ethTx.feeTokenId}
            tokensClassName="text-body"
          />
        )}
      </FormFieldSetRow>
    </>
  )
}

const NetworkFeeRowSol: FC<{ transaction: YieldxyzConfirmWizard["transaction"] }> = ({
  transaction,
}) => {
  const { t } = useTranslation()

  if (transaction?.platform !== "solana" || !transaction.estimatedFee) return null

  return (
    <FormFieldSetRow label={t("Network Fee")} variant="small" valueClassName="text-body-secondary">
      <TokensAndFiat
        planck={transaction.estimatedFee}
        tokenId={transaction.feeTokenId}
        tokensClassName="text-body"
      />
    </FormFieldSetRow>
  )
}
