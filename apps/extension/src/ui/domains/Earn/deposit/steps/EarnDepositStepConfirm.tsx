import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { WizardModalDialog } from "talisman-ui"
import { TransactionRequest } from "viem"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"

import { AccountDisplay } from "../../shared/AccountDisplay"
import { FormFieldSet, FormFieldSetRow, FormFieldSetSeparator } from "../../shared/FormFieldSet"
import { YieldxyzProviderDisplay } from "../../shared/YieldxyzProviderLogo"
import { YieldxyzTransactionsStepper } from "../../shared/YieldxyzTransactionsStepper"
import { YieldxyzProductTitleDisplay } from "../components/YieldxyzProductTitleDisplay"
import { YieldxyzProductYieldDisplay } from "../components/YieldxyzProductYieldDisplay"
import { useEarnDepositWizard } from "../context"
import { useEarnDepositModal } from "../useEarnDepositModal"

export const EarnDepositStepConfirm = () => {
  const { t } = useTranslation()
  const { close } = useEarnDepositModal()
  const { tokenIn, amountIn, address, action, network, product, transaction, goTo } =
    useEarnDepositWizard()

  if (!tokenIn || !amountIn || !address || !product || !action) return null

  return (
    <RiskAnalysisProvider
      riskAnalysis={transaction?.platform === "ethereum" ? transaction.riskAnalysis : undefined}
    >
      <WizardModalDialog
        className="size-full border-none"
        title={t("Enter Position")}
        onBackClick={() => goTo("amount")}
        onCloseClick={close}
      >
        <div className="flex size-full flex-col gap-8 overflow-hidden">
          <div className="text-md line-clamp-2 w-full text-center font-bold">
            {action.transactions.length > 1
              ? t("Approve {{count}} transactions", { count: action.transactions.length })
              : t("Approve transaction")}
          </div>
          <div className="flex grow flex-col justify-center">
            <StepsProgressDisplay />
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
            <FormFieldSetRow label={t("Network")} variant="small">
              <NetworkDisplay />
            </FormFieldSetRow>
            <NetworkFeeRow />
          </FormFieldSet>
          <SubmitButton />
        </div>
      </WizardModalDialog>
    </RiskAnalysisProvider>
  )
}

const StepsProgressDisplay = () => {
  const { action, stepIndex, isSubmitting } = useEarnDepositWizard()

  if (!action || stepIndex === null) return null

  return (
    <YieldxyzTransactionsStepper
      transactions={action.transactions}
      stepIndex={stepIndex}
      isSubmitting={isSubmitting}
    />
  )
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const {
    transaction,
    pendingTx,
    isSubmitting,
    onSubmit,
    stepIndex: txIndex,
    action,
  } = useEarnDepositWizard()

  const tx = useMemo<TxSubmitButtonTransaction | null>(() => {
    if (!transaction?.transaction) return null
    switch (transaction.platform) {
      case "ethereum":
        return {
          platform: "ethereum",
          payload: transaction.transaction as TransactionRequest, // TODO: check why we need to cast here
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
      disabled={!tx}
      isProcessing={isSubmitting || !!pendingTx}
    />
  )
}

const NetworkDisplay = () => {
  const { tokenIn } = useEarnDepositWizard()

  if (!tokenIn) return null

  return (
    <div className="text-body flex w-full items-center gap-2 overflow-hidden">
      <NetworkLogo className="size-8" networkId={tokenIn.networkId} />
      <NetworkName className="truncate" networkId={tokenIn.networkId} />
    </div>
  )
}

const NetworkFeeRow = () => {
  const { network } = useEarnDepositWizard()

  switch (network?.platform) {
    case "ethereum":
      return <NetworkFeeRowEth />
    default:
      return null
  }
}

const NetworkFeeRowEth = () => {
  const { t } = useTranslation()
  const { transaction } = useEarnDepositWizard()

  // keep the latest valid tx in state so we still have content to display after tx is submitted.
  // without this we'd be getting a lot of flickering and bad UX
  const [tx, setTx] = useState(transaction)
  useEffect(() => {
    if (transaction?.platform === "ethereum" && transaction.transaction && transaction.txDetails)
      setTx(transaction)
  }, [transaction])

  return (
    <>
      <FormFieldSetRow label={t("Transaction Priority")} variant="small">
        {!!tx?.transaction && !!tx.txDetails && (
          <EthFeeSelect
            key={tx.transaction.nonce} // reset internal state when tx changes
            tokenId={tx.feeTokenId}
            drawerContainerId="earn-modal"
            gasSettingsByPriority={tx.gasSettingsByPriority}
            priority={tx.priority}
            txDetails={tx.txDetails}
            networkUsage={tx.networkUsage}
            tx={tx.transaction}
            setCustomSettings={tx.setCustomSettings}
            onChange={tx.setPriority}
          />
        )}
      </FormFieldSetRow>
      <FormFieldSetRow
        label={t("Network Fee")}
        variant="small"
        valueClassName="text-body-secondary"
      >
        {!!tx?.txDetails && (
          <TokensAndFiat
            planck={tx.txDetails.estimatedFee.toString()}
            tokenId={tx.feeTokenId}
            tokensClassName="text-body"
          />
        )}
      </FormFieldSetRow>
    </>
  )
}
