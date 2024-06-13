import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { WithTooltip } from "@talisman/components/Tooltip"
import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { classNames, encodeAnyAddress } from "@talismn/util"
import useAccounts from "@ui/hooks/useAccounts"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { isEvmToken } from "@ui/util/isEvmToken"
import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import { Fiat } from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { RiskAnalysisPillButton, RiskAnalysisProvider } from "../Sign/Ethereum/riskAnalysis"
import { AddressDisplay } from "./AddressDisplay"
import { SendFundsFeeTooltip } from "./SendFundsFeeTooltip"
import { SendFundsHardwareEthereum } from "./SendFundsHardwareEthereum"
import { SendFundsHardwareSubstrate } from "./SendFundsHardwareSubstrate"
import { useNetworkDetails } from "./useNetworkDetails"
import { useSendFunds } from "./useSendFunds"

const SendFundsQrSubstrate = lazy(() => import("./SendFundsQrSubstrate"))

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
  const { networkId, networkName } = useNetworkDetails()

  if (!networkId) return null

  return (
    <div className="text-body flex items-center gap-4">
      <ChainLogo id={networkId} className="text-md" />
      {networkName}
    </div>
  )
}

const TotalAmountRow = () => {
  const { t } = useTranslation("send-funds")
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
  const { t } = useTranslation("send-funds")
  const { to } = useSendFunds()
  const accounts = useAccounts("owned")

  const showWarning = useMemo(() => {
    if (!to || !accounts) return false
    const encoded = encodeAnyAddress(to)
    return !accounts.some((account) => encodeAnyAddress(account.address) === encoded)
  }, [accounts, to])

  if (!showWarning) return null

  return (
    <div className="text-alert-warn bg-grey-900 flex w-full items-center gap-2 rounded-sm px-2 py-6 text-xs">
      <AlertCircleIcon className="shrink-0 text-[1.4rem]" />
      <div>
        {t(
          "You are sending to an external account. To prevent loss of funds, make sure you are sending on the right network."
        )}
      </div>
    </div>
  )
}

const SendButton = () => {
  const { t } = useTranslation("send-funds")
  const { signMethod, sendErrorMessage, send, isProcessing } = useSendFunds()

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsReady(true)
    }, 1_000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <Suspense fallback={null}>
      <div className="flex w-full flex-col gap-6">
        {sendErrorMessage ? (
          <div className="text-alert-warn bg-grey-900 flex w-full items-center gap-5 rounded-sm px-5 py-6 text-xs">
            <AlertCircleIcon className="text-lg" />
            <div>{sendErrorMessage}</div>
          </div>
        ) : (
          <ExternalRecipientWarning />
        )}
        {signMethod === "normal" && (
          <Button
            className="w-full"
            primary
            disabled={!isReady}
            onClick={send}
            processing={isProcessing}
          >
            {t("Confirm")}
          </Button>
        )}
        {signMethod === "qrSubstrate" && <SendFundsQrSubstrate />}
        {signMethod === "hardwareSubstrate" && <SendFundsHardwareSubstrate />}
        {signMethod === "hardwareEthereum" && <SendFundsHardwareEthereum />}
      </div>
    </Suspense>
  )
}

const EvmFeeSummary = () => {
  const { t } = useTranslation("send-funds")
  const { token, evmNetwork, evmTransaction } = useSendFunds()

  if (!token || !evmTransaction) return null

  const {
    tx,
    txDetails,
    priority,
    gasSettingsByPriority,
    setCustomSettings,
    setPriority,
    networkUsage,
    isLoading,
  } = evmTransaction

  return (
    <>
      <div className="mt-2 flex h-12 items-center justify-between gap-8 text-xs">
        <div className="text-body-secondary">{t("Transaction Priority")}</div>
        <div>
          {evmNetwork?.nativeToken?.id && priority && tx && txDetails && (
            <EthFeeSelect
              tokenId={evmNetwork.nativeToken.id}
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
              {txDetails?.estimatedFee && evmNetwork?.nativeToken && (
                <TokensAndFiat
                  planck={txDetails.estimatedFee.toString()}
                  tokenId={evmNetwork.nativeToken.id}
                />
              )}
            </>
          </div>
        </div>
      </div>
    </>
  )
}

const SubFeeSummary = () => {
  const { t } = useTranslation("send-funds")
  const { subTransaction, feeToken, tip, tipToken } = useSendFunds()

  if (!subTransaction) return null

  const { isRefetching, isLoading, partialFee, error } = subTransaction

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
              isRefetching && "animate-pulse"
            )}
          >
            <>
              {isLoading && <LoaderIcon className="animate-spin-slow mr-2 inline align-text-top" />}
              {partialFee && feeToken && (
                <TokensAndFiat planck={partialFee} tokenId={feeToken.id} />
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

  if (isEvmToken(token)) return <EvmFeeSummary />
  return <SubFeeSummary />
}

export const SendFundsConfirmForm = () => {
  const { t } = useTranslation("send-funds")
  const { from, to, chain, evmNetwork, evmTransaction } = useSendFunds()

  return (
    <RiskAnalysisProvider riskAnalysis={evmTransaction?.riskAnalysis}>
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
                <AddressDisplay
                  className="h-16"
                  address={from}
                  chainId={chain?.id}
                  evmNetworkId={evmNetwork?.id}
                />
              </div>
              <div className="flex h-16 items-center justify-between gap-8">
                <div className="text-body-secondary whitespace-nowrap">{t("To")}</div>
                <AddressDisplay
                  className="h-16"
                  address={to}
                  chainId={chain?.id}
                  evmNetworkId={evmNetwork?.id}
                />
              </div>
              <div className="py-8">
                <hr className="text-grey-800" />
              </div>
              <div className="mt-4 flex items-center justify-between gap-8 text-xs">
                <div className="text-body-secondary">{t("Network")}</div>
                <NetworkDisplay />
              </div>
              <FeeSummary />
              <TotalAmountRow />
            </div>
          </div>
        </ScrollContainer>
        {evmTransaction && <RiskAnalysisPillButton />}
        <SendButton />
      </div>
    </RiskAnalysisProvider>
  )
}
