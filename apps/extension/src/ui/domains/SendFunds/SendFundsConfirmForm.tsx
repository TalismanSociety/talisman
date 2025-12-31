import { isTokenEth } from "@talismn/chaindata-provider"
import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Checkbox } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { WithTooltip } from "@talisman/components/Tooltip"
import { useSelectedCurrency } from "@ui/state"

import { Fiat } from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { NetworkLogo } from "../Networks/NetworkLogo"
import { BittensorValidatorName } from "../Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { RiskAnalysisProvider } from "../Sign/risk-analysis/context"
import { RiskAnalysisPillButton } from "../Sign/risk-analysis/RiskAnalysisPillButton"
import { TxSubmitButton } from "../Sign/TxSubmitButton/TxSignButton"
import { TxSubmitButtonTransaction } from "../Sign/TxSubmitButton/types"
import { AddressDisplay } from "./AddressDisplay"
import { SendFundsFeeTooltip } from "./SendFundsFeeTooltip"
import {
  ExternalAddressWarningProvider,
  useExternalAddressWarning,
} from "./useExternalAddressWarning"
import { useSendFunds } from "./useSendFunds"

const AmountDisplay = () => {
  const { sendMax, maxAmount, transfer, token } = useSendFunds()
  const amount = sendMax ? maxAmount : transfer

  if (!amount || !token) return <div className="bg-grey-750 h-12 w-64 animate-pulse rounded-sm" />

  return (
    <div className="flex w-full items-center justify-end gap-4 text-right">
      <TokenLogo tokenId={token.id} className="text-lg" />
      <TokensAndFiat tokenId={token.id} planck={amount?.planck} noCountUp />
    </div>
  )
}

const NetworkDisplay = () => {
  const { network } = useSendFunds()

  if (!network) return null

  return (
    <div className="text-body flex items-center gap-4">
      <NetworkLogo networkId={network.id} className="text-md" />
      {network.name}
    </div>
  )
}

const TotalAmountRow = () => {
  const { t } = useTranslation()
  const {
    sendMax,
    maxAmount,
    transfer,
    tokenRates,
    estimatedFee,
    tip,
    feeTokenRates,
    tipTokenRates,
  } = useSendFunds()
  const amount = sendMax ? maxAmount : transfer

  const currency = useSelectedCurrency()

  const totalValue = useMemo(() => {
    // Not all tokens have a fiat rate. if one of the 3 tokens doesn't have a rate, don't show the row
    if (
      !amount ||
      !tokenRates ||
      !estimatedFee ||
      !feeTokenRates ||
      (tip && tip.planck > 0n && !tipTokenRates)
    )
      return null

    const fiatAmount = amount.fiat(currency) ?? 0
    const fiatFee = estimatedFee.fiat(currency) ?? 0
    const fiatTip = tip?.fiat(currency) ?? 0

    return fiatAmount + fiatFee + fiatTip
  }, [amount, currency, estimatedFee, feeTokenRates, tip, tipTokenRates, tokenRates])

  if (!totalValue) return null

  return (
    <div className="mt-4 flex h-[1.7rem] justify-between text-xs">
      <div className="text-body-secondary">{t("Total Amount")}</div>
      <div className="text-body">
        {totalValue ? (
          <Fiat amount={totalValue} />
        ) : (
          <LoaderIcon className="animate-spin-slow mr-2 inline align-text-top" />
        )}
      </div>
    </div>
  )
}

export const ExternalRecipientWarning = () => {
  const { t } = useTranslation()
  const {
    warningType,
    isWarningAcknowledged,
    setIsWarningAcknowledged,
    dontRemindAgain,
    setDontRemindAgain,
  } = useExternalAddressWarning()
  const { network, token } = useSendFunds()

  const handleCheckChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsWarningAcknowledged(e.target.checked)
    },
    [setIsWarningAcknowledged],
  )

  const handleDontRemindChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDontRemindAgain(e.target.checked)
    },
    [setDontRemindAgain],
  )

  if (warningType === "none") return null

  return (
    <div className="text-alert-warn bg-alert-warn/10 flex w-full items-center gap-4 rounded-sm p-4 text-xs">
      <AlertCircleIcon className="shrink-0 text-[2rem]" />
      {warningType === "network" && network && token && (
        <div>
          <div>
            <Trans
              t={t}
              components={{
                Network: <span className="font-bold text-white">{network?.name}</span>,
              }}
              i18nKey="Warning: If sending to a centralized exchange, make sure it expects to receive funds on <Network /> network. Sending to the wrong network will result in loss of funds."
            />
          </div>
          <div className="text-body mt-4 space-y-2">
            <Checkbox checked={isWarningAcknowledged} onChange={handleCheckChange}>
              {t("Recipient supports {{token}} on {{network}}", {
                token: token.name,
                network: network.name,
              })}
            </Checkbox>
            {isWarningAcknowledged && (
              <Checkbox checked={dontRemindAgain} onChange={handleDontRemindChange}>
                {t("Don't remind me again for this address")}
              </Checkbox>
            )}
          </div>
        </div>
      )}
      {warningType === "alpha" && (
        <div>
          <div>
            {t(
              "Warning: Alpha tokens (including root staked tokens) are not supported by most centralized exchanges. Sending to a centralized exchange will result in loss of funds.",
            )}
          </div>
          <div className="text-body mt-2 space-y-2">
            <Checkbox checked={isWarningAcknowledged} onChange={handleCheckChange}>
              {t("Recipient is not a centralized exchange")}
            </Checkbox>
            {isWarningAcknowledged && (
              <Checkbox checked={dontRemindAgain} onChange={handleDontRemindChange}>
                {t("Don't remind me again for this address")}
              </Checkbox>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const SendButton = () => {
  const { t } = useTranslation()
  const { network, onSubmitted, transaction, txInfo } = useSendFunds()
  const { canConfirm, saveConfirmation } = useExternalAddressWarning()

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // enable the sign button after 1 second
    const timeout = setTimeout(() => {
      setIsReady(true)
    }, 1_000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = useCallback(
    (txId: string) => {
      if (!network) return

      saveConfirmation()
      onSubmitted({
        networkId: network.id,
        txId,
      })
    },
    [network, onSubmitted, saveConfirmation],
  )

  const tx = useMemo<TxSubmitButtonTransaction | null>(() => {
    if (!network || !txInfo || !transaction) return null

    switch (transaction.platform) {
      case "polkadot":
        return transaction.payload
          ? {
              platform: "polkadot",
              payload: transaction.payload,
              txMetadata: transaction.shortMetadata,
              txInfo,
            }
          : null
      case "ethereum":
        return transaction.tx
          ? {
              platform: "ethereum",
              networkId: network.id,
              payload: transaction.tx,
              txInfo,
            }
          : null
      case "solana":
        return transaction.tx
          ? {
              platform: "solana",
              networkId: network.id,
              payload: transaction.tx,
              txInfo,
            }
          : null
      default:
        throw new Error(`Unsupported transaction platform`)
    }
  }, [transaction, network, txInfo])

  return (
    <Suspense fallback={<SuspenseTracker name="SendButton" />}>
      <div className="flex w-full flex-col gap-6" data-testid="send-funds-confirm-button">
        <ExternalRecipientWarning />
        <TxSubmitButton
          label={t("Confirm")}
          onSubmit={handleSubmit}
          tx={tx}
          disabled={!isReady || !canConfirm}
          containerId="main"
        />
      </div>
    </Suspense>
  )
}

const EthFeeSummary = () => {
  const { t } = useTranslation()
  const { token, network, transaction } = useSendFunds()

  if (!token || transaction?.platform !== "ethereum" || network?.platform !== "ethereum")
    return null

  const {
    tx,
    txDetails,
    priority,
    gasSettingsByPriority,
    setCustomSettings,
    setPriority,
    networkUsage,
    isLoading,
  } = transaction

  return (
    <>
      <div className="mt-2 flex h-12 items-center justify-between gap-8 text-xs">
        <div className="text-body-secondary">{t("Transaction Priority")}</div>
        <div>
          {network.nativeTokenId && priority && tx && txDetails && (
            <EthFeeSelect
              tokenId={network.nativeTokenId}
              drawerContainerId="main"
              gasSettingsByPriority={gasSettingsByPriority}
              setCustomSettings={setCustomSettings}
              onChange={setPriority}
              priority={priority}
              txDetails={txDetails}
              networkUsage={networkUsage}
              tx={tx}
            />
          )}
        </div>
      </div>
      <div className="mt-4 flex h-[1.7rem] items-center justify-between gap-8 text-xs">
        <div className="text-body-secondary">
          {t("Estimated Fee")} <SendFundsFeeTooltip />
        </div>
        <div className="text-body">
          <div className="inline-flex h-[1.7rem] items-center">
            <>
              {isLoading && <LoaderIcon className="animate-spin-slow mr-2 inline align-text-top" />}
              {txDetails?.estimatedFee && network && (
                <TokensAndFiat
                  planck={txDetails.estimatedFee.toString()}
                  tokenId={network.nativeTokenId}
                />
              )}
            </>
          </div>
        </div>
      </div>
    </>
  )
}

const DefaultFeeSummary = () => {
  const { t } = useTranslation()
  const { transaction, feeToken, tip, tipToken } = useSendFunds()

  if (!transaction || transaction.platform === "ethereum") return null

  const { isRefetching, isLoading, estimatedFee, error } = transaction

  return (
    <>
      {!!tip && !!tipToken && tip.planck > 0n && (
        <div className="mt-4 flex h-[1.7rem] items-center justify-between gap-8 text-xs">
          <div className="text-body-secondary">{t("Tip")}</div>
          <div className="text-body">
            <div className={classNames("inline-flex h-[1.7rem] items-center")}>
              <TokensAndFiat planck={tip.planck} tokenId={tipToken.id} />
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 flex h-[1.7rem] items-center justify-between gap-8 text-xs">
        <div className="text-body-secondary">
          {t("Estimated Fee")} <SendFundsFeeTooltip />
        </div>
        <div className="text-body">
          <div
            className={classNames(
              "inline-flex h-[1.7rem] items-center",
              isRefetching && "animate-pulse",
            )}
          >
            <>
              {isLoading && <LoaderIcon className="animate-spin-slow mr-2 inline align-text-top" />}
              {estimatedFee && feeToken && (
                <TokensAndFiat planck={estimatedFee} tokenId={feeToken.id} />
              )}
              {error && (
                <WithTooltip tooltip={(error as Error).message}>
                  <span className="text-alert-warn">{t("Failed to estimate fee")}</span>
                </WithTooltip>
              )}
            </>
          </div>
        </div>
      </div>
    </>
  )
}

const FeeSummary = () => {
  const { token } = useSendFunds()

  if (isTokenEth(token)) return <EthFeeSummary />
  return <DefaultFeeSummary />
}

export const SendFundsConfirmForm = () => {
  const { t } = useTranslation()
  const { from, to, network, transaction } = useSendFunds()

  const riskAnalysis = useMemo(() => {
    switch (transaction?.platform) {
      case "ethereum":
      case "solana":
        return transaction.riskAnalysis
      default:
        return undefined
    }
  }, [transaction])

  return (
    <ExternalAddressWarningProvider>
      <RiskAnalysisProvider riskAnalysis={riskAnalysis}>
        <div className="flex h-full w-full flex-col items-center gap-6 px-12 pb-8">
          <ScrollContainer
            className="w-full grow"
            innerClassName="flex flex-col w-full items-center space-between min-h-full"
          >
            <div className="h-32 text-lg font-bold">{t("You are sending")}</div>
            <div className="w-full grow">
              <div className="bg-grey-900 text-body-secondary flex flex-col rounded px-12 py-8 leading-[140%]">
                <div className="text-body flex h-16 items-center justify-between gap-8">
                  <div className="text-body-secondary whitespace-nowrap">{t("Amount")}</div>
                  <AmountDisplay />
                </div>
                <div className="flex h-16 items-center justify-between gap-8">
                  <div className="text-body-secondary whitespace-nowrap">{t("From")}</div>
                  <AddressDisplay className="h-16" address={from} networkId={network?.id} />
                </div>
                <div className="flex h-16 items-center justify-between gap-8">
                  <div className="text-body-secondary whitespace-nowrap">{t("To")}</div>
                  <AddressDisplay className="h-16" address={to} networkId={network?.id} />
                </div>
                <div className="py-8">
                  <hr className="text-grey-800" />
                </div>
                <BittensorAlphaTokenRow />
                <div className="mt-4 flex items-center justify-between gap-8 text-xs">
                  <div className="text-body-secondary">{t("Network")}</div>
                  <NetworkDisplay />
                </div>
                <FeeSummary />
                <TotalAmountRow />
              </div>
            </div>
          </ScrollContainer>
          {riskAnalysis && <RiskAnalysisPillButton />}
          <SendButton />
        </div>
      </RiskAnalysisProvider>
    </ExternalAddressWarningProvider>
  )
}

const BittensorAlphaTokenRow: FC = () => {
  const { t } = useTranslation()
  const { token } = useSendFunds()

  if (token?.type !== "substrate-dtao") return null

  return (
    <div className="mt-4 flex w-full items-center justify-between gap-8 overflow-hidden text-xs">
      <div className="text-body-secondary">{t("Token")}</div>
      <div className={classNames("truncate", token.netuid === 0 ? "text-alert-warn" : "text-body")}>
        {token.name}
        <BittensorValidatorName hotkey={token.hotkey} prefix=" | " />
      </div>
    </div>
  )
}
