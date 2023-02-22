import { WithTooltip } from "@talisman/components/Tooltip"
import { AlertCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { isEvmToken } from "@ui/util/isEvmToken"
import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { AddressDisplay } from "./AddressDisplay"
import { SendFundsFeeTooltip } from "./SendFundsFeeTooltip"
import { useSendFunds } from "./useSendFunds"

const SendFundsLedgerSubstrate = lazy(() => import("./SendFundsLedgerSubstrate"))
const SendFundsLedgerEthereum = lazy(() => import("./SendFundsLedgerEthereum"))

const AmountDisplay = () => {
  const { sendMax, maxAmount, transfer, token } = useSendFunds()
  const amount = sendMax ? maxAmount : transfer

  if (!amount || !token) return <div className="bg-grey-750 h-12 w-64 animate-pulse rounded-sm" />

  return (
    <div className="inline-flex h-12 items-center gap-4">
      <TokenLogo tokenId={token.id} className="inline-block text-lg" />
      <TokensAndFiat tokenId={token.id} planck={amount?.planck} noCountUp />
    </div>
  )
}

const NetworkDisplay = () => {
  const { chain, evmNetwork } = useSendFunds()

  const { networkId, networkName } = useMemo(
    () => ({
      networkId: (chain ?? evmNetwork)?.id,
      networkName:
        chain?.name ??
        (evmNetwork ? `${evmNetwork?.name}${evmNetwork?.substrateChain ? " (Ethereum)" : ""}` : ""),
    }),
    [chain, evmNetwork]
  )

  if (!networkId) return null

  return (
    <span className="inline-flex items-center gap-4">
      <ChainLogo id={networkId} className="inline text-lg" />
      <span>{networkName}</span>
    </span>
  )
}

const TotalValueRow = () => {
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

    const fiatAmount = amount.fiat("usd") ?? 0
    const fiatFee = estimatedFee.fiat("usd") ?? 0
    const fiatTip = tip?.fiat("usd") ?? 0

    return fiatAmount + fiatFee + fiatTip
  }, [amount, estimatedFee, feeTokenRates, tip, tipTokenRates, tokenRates])

  if (!totalValue) return null

  return (
    <div className="mt-4 flex h-[1.7rem] justify-between text-xs">
      <div className="text-body-secondary">Total Value</div>
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

const SendButton = () => {
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
      {sendErrorMessage && (
        <div className="text-alert-warn bg-grey-900 flex w-full items-center gap-5 rounded-sm px-5 py-6 text-xs">
          <AlertCircleIcon className="text-lg" />
          <div>{sendErrorMessage}</div>
        </div>
      )}
      {signMethod === "normal" && (
        <Button
          className="mt-12 w-full"
          primary
          disabled={!isReady}
          onClick={send}
          processing={isProcessing}
        >
          Confirm
        </Button>
      )}
      {signMethod === "ledgerSubstrate" && <SendFundsLedgerSubstrate />}
      {signMethod === "ledgerEthereum" && <SendFundsLedgerEthereum />}
    </Suspense>
  )
}

const EvmFeeSummary = () => {
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
      <div className="flex h-12 items-center justify-between gap-8 text-xs">
        <div className="text-body-secondary">Transaction Priority</div>
        <div>
          {evmNetwork?.nativeToken?.id && priority && tx && txDetails && (
            <EthFeeSelect
              tokenId={evmNetwork.nativeToken.id}
              drawerContainer={document.getElementById("send-funds-main")}
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
          Estimated Fee <SendFundsFeeTooltip />
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
  const { subTransaction, feeToken, tip, tipToken } = useSendFunds()

  if (!subTransaction) return null

  const { isRefetching, isLoading, partialFee, error } = subTransaction

  return (
    <>
      {!!tip && !!tipToken && tip.planck > 0n && (
        <div className="mt-4 flex h-[1.7rem] items-center justify-between gap-8 text-xs">
          <div className="text-body-secondary">Tip</div>
          <div className="text-body">
            <div className={classNames("inline-flex h-[1.7rem] items-center")}>
              <TokensAndFiat planck={tip.planck} tokenId={tipToken.id} />
            </div>
          </div>
        </div>
      )}
      <div className="mt-4 flex h-[1.7rem] items-center justify-between gap-8 text-xs">
        <div className="text-body-secondary">
          Estimated Fee <SendFundsFeeTooltip />
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
                  <span className="text-alert-warn">Failed to estimate fee</span>
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
  const { from, to, chain, evmNetwork } = useSendFunds()

  return (
    <div className="flex h-full w-full flex-col items-center px-12 py-8">
      <div className="text-lg font-bold">You are sending</div>
      <div className="mt-24 w-full grow">
        <div className="bg-grey-900 text-body-secondary space-y-4 rounded px-8 py-4 leading-[140%]">
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="text-body-secondary">Amount</div>
            <div className="text-body h-12">
              <AmountDisplay />
            </div>
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="text-body-secondary">From</div>
            <div className="text-body overflow-hidden">
              <AddressDisplay address={from} chainId={chain?.id} evmNetworkId={evmNetwork?.id} />
            </div>
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="text-body-secondary">To</div>
            <div className="text-body overflow-hidden">
              <AddressDisplay address={to} chainId={chain?.id} evmNetworkId={evmNetwork?.id} />
            </div>
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="text-body-secondary">Network</div>
            <div className="text-body  h-12 overflow-hidden">
              <NetworkDisplay />
            </div>
          </div>
          <div className="py-8">
            <hr className="text-grey-800" />
          </div>
          <FeeSummary />
          <TotalValueRow />
        </div>
      </div>
      <SendButton />
    </div>
  )
}
