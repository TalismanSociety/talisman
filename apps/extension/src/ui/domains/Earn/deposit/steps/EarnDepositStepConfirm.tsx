import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, WizardModalDialog } from "talisman-ui"
import { TransactionRequest } from "viem"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"

import { AccountDisplay } from "../../shared/AccountDisplay"
import { FormFieldSet, FormFieldSetRow, FormFieldSetSeparator } from "../../shared/FormFieldSet"
import { YieldxyzTransactionsStepper } from "../../shared/YieldxyzTransactionsStepper"
import { useEarnDepositWizard } from "../context"
import { useEarnDepositModal } from "../useEarnDepositModal"

export const EarnDepositStepConfirm = () => {
  const { t } = useTranslation()
  const { close } = useEarnDepositModal()
  const { tokenIn, amountIn, address, network, product, transaction, goTo } = useEarnDepositWizard()

  if (!tokenIn || !amountIn || !address || !product) throw new Error("TokenIn is not defined")

  return (
    <RiskAnalysisProvider
      riskAnalysis={transaction?.platform === "ethereum" ? transaction.riskAnalysis : undefined}
    >
      <WizardModalDialog
        className="size-full border-none"
        title={t("Confirm Deposit")}
        onBackClick={() => goTo("amount")}
        onCloseClick={close}
      >
        <div className="flex size-full flex-col gap-8 overflow-hidden">
          <div className="text-md line-clamp-2 w-full text-center font-bold">
            {product.metadata.description}
          </div>
          <div className="grow">
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
            <FormFieldSetRow label={t("APY")}>12%</FormFieldSetRow>
            <FormFieldSetSeparator />
            <NetworkFeeRow />
          </FormFieldSet>
          <SubmitButton />
        </div>
      </WizardModalDialog>
    </RiskAnalysisProvider>
  )
}

const StepsProgressDisplay = () => {
  const { action, stepIndex } = useEarnDepositWizard()

  if (!action || stepIndex === null) return null

  return <YieldxyzTransactionsStepper transactions={action.transactions} stepIndex={stepIndex} />
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const { transaction, pendingTx, onSubmit, stepIndex: txIndex, action } = useEarnDepositWizard()

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

  const [submitting, setSubmitting] = useState(false)
  const handleSubmit = useCallback(
    async (txId: string) => {
      setSubmitting(true)
      try {
        await onSubmit(txId)
      } finally {
        setSubmitting(false)
      }
    },
    [onSubmit],
  )

  // display a fake button while processing, as TxSubmitButton is designed with a redirect to TxProgress in mind
  if (!tx || pendingTx || submitting)
    return (
      <Button primary fullWidth processing>
        {t("Processing...")}
      </Button>
    )

  return (
    <TxSubmitButton
      containerId="earn-modal"
      tx={tx}
      label={`${t("Approve")} (${(txIndex ?? 0) + 1}/${action?.transactions.length ?? "?"})`}
      className="w-full"
      onSubmit={handleSubmit}
    />
  )
}

const NetworkFeeRow = () => {
  const { transaction } = useEarnDepositWizard()

  switch (transaction?.platform) {
    case "ethereum":
      return <NetworkFeeRowEth />
    default:
      return null
  }
}

const NetworkFeeRowEth = () => {
  const { t } = useTranslation()
  const { transaction } = useEarnDepositWizard()

  if (transaction?.platform !== "ethereum") return null

  return (
    <>
      <FormFieldSetRow label={t("Transaction Priority")} variant="small">
        {!!transaction.transaction && !!transaction.txDetails && (
          <EthFeeSelect
            tokenId={transaction.feeTokenId}
            drawerContainerId="earn-modal"
            gasSettingsByPriority={transaction.gasSettingsByPriority}
            priority={transaction.priority}
            txDetails={transaction.txDetails}
            networkUsage={transaction.networkUsage}
            tx={transaction.transaction}
            setCustomSettings={transaction.setCustomSettings}
            onChange={transaction.setPriority}
          />
        )}
      </FormFieldSetRow>
      <FormFieldSetRow
        label={t("Network Fee")}
        variant="small"
        valueClassName="text-body-secondary"
      >
        {!!transaction.txDetails && (
          <TokensAndFiat
            planck={transaction.txDetails.estimatedFee.toString()}
            tokenId={transaction.feeTokenId}
            tokensClassName="text-body"
          />
        )}
      </FormFieldSetRow>
    </>
  )
}
