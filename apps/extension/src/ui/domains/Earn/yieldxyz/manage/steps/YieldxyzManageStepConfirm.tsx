import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { ActionDto } from "extension-core"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger, WizardModalDialog } from "talisman-ui"
import { TransactionRequest } from "viem"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { RiskAnalysisPillButton } from "@ui/domains/Sign/risk-analysis/RiskAnalysisPillButton"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"

import { AccountDisplay } from "../../../shared/AccountDisplay"
import { FormFieldSet, FormFieldSetRow, FormFieldSetSeparator } from "../../../shared/FormFieldSet"
import { YieldxyzProductTitleDisplay } from "../../components/YieldxyzProductTitleDisplay"
import { YieldxyzProviderDisplay } from "../../components/YieldxyzProviderLogo"
import { YieldxyzTokensAndFiat } from "../../components/YieldxyzTokensAndFiat"
import { YieldxyzTransactionsStepper } from "../../components/YieldxyzTransactionsStepper"
import { useYieldxyzManageModal } from "../useYieldxyzManageModal"
import { useYieldxyzManageWizard } from "../useYieldxyzManageWizard"

export const YieldxyzManageStepConfirm = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzManageModal()
  const { position, action, network, transaction, balance, isLoadingAction } =
    useYieldxyzManageWizard()
  const actionTitle = useActionTitle(action)

  if (!action && isLoadingAction) return <ActionCreatingShimmer />

  if (!position || !action) return null

  return (
    <RiskAnalysisProvider
      riskAnalysis={transaction?.platform === "ethereum" ? transaction.riskAnalysis : undefined}
      containerId="earn-modal"
    >
      <WizardModalDialog className="size-full border-none" title={actionTitle} onCloseClick={close}>
        <div className="flex size-full flex-col gap-8 overflow-hidden">
          <div className="text-md line-clamp-2 w-full text-center font-bold">
            {action.transactions.length > 1
              ? t("Approve {{count}} transactions", { count: action.transactions.length })
              : t("Approve transaction")}
          </div>
          <div className="flex w-full grow flex-col items-center justify-center gap-6 overflow-hidden">
            <StepsProgressDisplay />
            <RiskAnalysisButton />
            <TransactionError />
          </div>
          <FormFieldSet>
            {!!balance && (
              <FormFieldSetRow label={t("Amount")}>
                <YieldxyzTokensAndFiat
                  withLogo
                  token={balance.token}
                  amountRaw={balance.amountRaw}
                  className="text-body-secondary"
                  tokensClassName="text-body"
                />
              </FormFieldSetRow>
            )}
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

const RiskAnalysisButton = () => {
  const { transaction } = useYieldxyzManageWizard()

  if (transaction?.platform !== "ethereum") return null

  return (
    <div>
      <RiskAnalysisPillButton />
    </div>
  )
}

const ActionCreatingShimmer = () => {
  {
    const { t } = useTranslation()

    return (
      <div className="text-body-secondary flex flex-col items-center gap-2 pt-64 leading-[140%]">
        <LoaderIcon className="animate-spin-slow h-16 w-16" />
        <div className="mt-4 text-base font-bold text-white opacity-70">
          {t("Preparing operation")}
        </div>
        <div className="text-sm font-normal opacity-70">{t("This shouldn't take long...")}</div>
      </div>
    )
  }
}

const TransactionError = () => {
  const { transaction, isProcessing } = useYieldxyzManageWizard()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "text-brand-orange text-center text-xs",
            // do not display error while isProcessing=true, as it has already has been executed
            (isProcessing || !transaction?.error) && "invisible",
          )}
        >
          <AlertCircleIcon className="inline-block align-text-top text-sm" /> {transaction?.error}
        </div>
      </TooltipTrigger>
      {!!transaction?.errorDetails && <TooltipContent>{transaction?.errorDetails}</TooltipContent>}
    </Tooltip>
  )
}

const StepsProgressDisplay = () => {
  const { action, stepIndex, isProcessing } = useYieldxyzManageWizard()

  if (!action || stepIndex === null) return null

  return (
    <YieldxyzTransactionsStepper
      transactions={action.transactions}
      stepIndex={stepIndex}
      isProcessing={isProcessing}
    />
  )
}

const SubmitButton = () => {
  const { t } = useTranslation()
  const {
    transaction,
    isProcessing,
    onSubmit,
    stepIndex: txIndex,
    action,
  } = useYieldxyzManageWizard()

  const tx = useMemo<TxSubmitButtonTransaction | null>(() => {
    if (!transaction?.transaction) return null
    switch (transaction.platform) {
      case "ethereum":
        return {
          platform: "ethereum",
          payload: transaction.transaction as TransactionRequest,
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
      isProcessing={isProcessing}
    />
  )
}

const NetworkDisplay = () => {
  const { position } = useYieldxyzManageWizard()

  if (!position) return null

  return (
    <div className="text-body flex w-full items-center gap-2 overflow-hidden">
      <NetworkLogo className="size-8" networkId={position.networkId} />
      <NetworkName className="truncate" networkId={position.networkId} />
    </div>
  )
}

const NetworkFeeRow = () => {
  const { network } = useYieldxyzManageWizard()

  switch (network?.platform) {
    case "ethereum":
      return <NetworkFeeRowEth />
    default:
      return null
  }
}

const NetworkFeeRowEth = () => {
  const { t } = useTranslation()
  const { transaction } = useYieldxyzManageWizard()

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

const useActionTitle = (action: ActionDto | null) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (!action) return t("Manage Position")

    switch (action.type) {
      case "CLAIM_REWARDS":
        return t("Claim Rewards")
      case "CLAIM_UNSTAKED":
        return t("Finalize Withdraw")
      case "RESTAKE_REWARDS":
        return t("Restake Rewards")
      case "DELEGATE":
        return t("Delegate Stake")
      case "MIGRATE":
        return t("Migrate")
      case "REBOND":
        return t("Rebond")
      case "RESTAKE":
        return t("Restake")
      case "REVOKE":
        return t("Revoke")
      case "REVOTE":
        return t("Revote")
      case "STAKE":
        return t("Stake")
      case "STAKE_LOCKED":
        return t("Stake Locked")
      case "UNLOCK_LOCKED":
        return t("Unlock")
      case "UNSTAKE":
        return t("Unstake")
      case "VERIFY_WITHDRAW_CREDENTIALS":
        return t("Verify Withdraw Credentials")
      case "VOTE":
        return t("Vote")
      case "VOTE_LOCKED":
        return t("Vote Locked")
      case "WITHDRAW":
        return t("Withdraw")
      case "WITHDRAW_ALL":
        return t("Withdraw All")
      default:
        return t("Manage Position")
    }
  }, [action, t])
}
