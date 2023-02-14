import { log } from "@core/log"
import { notify } from "@talisman/components/Notifications"
import { WithTooltip } from "@talisman/components/Tooltip"
import { AlertCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useBalance } from "@ui/hooks/useBalance"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { isEvmToken } from "@ui/util/isEvmToken"
import { FC, Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { ChainLogo } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { AddressDisplay } from "./AddressDisplay"
import { useFeeToken } from "./useFeeToken"
import { SendFundsConfirmProvider, useSendFundsConfirm } from "./useSendFundsConfirm"
import { useSendFundsEstimateFee } from "./useSendFundsEstimateFee"

const SendFundsLedgerSubstrate = lazy(() => import("./SendFundsLedgerSubstrate"))
const SendFundsLedgerEthereum = lazy(() => import("./SendFundsLedgerEthereum"))

const TokenDisplay = () => {
  const { tokenId, amount } = useSendFundsWizard()

  return (
    <div className="inline-flex h-12 items-center gap-4">
      <TokenLogo tokenId={tokenId} className="inline-block text-lg" />
      <TokensAndFiat tokenId={tokenId} planck={amount} noCountUp />
    </div>
  )
}

const NetworkDisplay = () => {
  const { tokenId } = useSendFundsWizard()
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

  const { networkId, networkName } = useMemo(
    () => ({
      networkId: (chain ?? evmNetwork)?.id,
      networkName:
        chain?.name ??
        (evmNetwork ? `${evmNetwork?.name}${evmNetwork?.substrateChain ? " (Ethereum)" : ""}` : ""),
    }),
    [chain, evmNetwork]
  )

  if (!token) return null

  return (
    <span className="inline-flex items-center gap-4">
      <ChainLogo id={networkId} className="inline text-lg" />
      <span>{networkName}</span>
    </span>
  )
}

const TotalValueRow = () => {
  const { tokenId, amount } = useSendFundsWizard()
  const { tip, subTransaction, evmTransaction } = useSendFundsConfirm()
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

  const feeToken = useFeeToken(tokenId)
  const feeTokenRates = useTokenRates(feeToken?.id)

  const chain = useChain(token?.chain?.id)
  const tipToken = useToken(chain?.nativeToken?.id)
  const tipTokenRates = useTokenRates(tipToken?.id)

  const totalValue = useMemo(() => {
    // Not all tokens have a fiat rate. if one of the 3 tokens doesn't have a rate, don't show the row
    if (
      !tokenRates ||
      !feeTokenRates ||
      (tip !== "0" && !tipTokenRates) ||
      (!subTransaction?.partialFee && !evmTransaction?.txDetails?.estimatedFee)
    )
      return null
    if (!token || !feeToken || (tip !== "0" && !tipToken)) return null

    const estimatedFee =
      subTransaction?.partialFee ?? evmTransaction?.txDetails?.estimatedFee?.toString() ?? "0"

    const fiatAmount = new BalanceFormatter(amount, token.decimals, tokenRates).fiat("usd") ?? 0
    const fiatFee =
      new BalanceFormatter(estimatedFee, feeToken.decimals, tokenRates).fiat("usd") ?? 0
    const fiatTip =
      tip !== "0" && tipToken
        ? new BalanceFormatter(amount, tipToken.decimals, tokenRates).fiat("usd") ?? 0
        : 0

    return fiatAmount + fiatFee + fiatTip
  }, [
    amount,
    evmTransaction,
    feeToken,
    feeTokenRates,
    subTransaction,
    tip,
    tipToken,
    tipTokenRates,
    token,
    tokenRates,
  ])

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

// const EstimateFeeDisplay = () => {
//   const { from, to, amount, tokenId, allowReap } = useSendFundsWizard()
//   const feeToken = useFeeToken(tokenId)

//   const { tip } = useSendFundsConfirm() // useTip(token?.chain?.id, true) // TODO stop refreshing when validated
//   const { data, error, isLoading, isRefetching } = useSendFundsEstimateFee(
//     from,
//     to,
//     tokenId,
//     amount,
//     tip,
//     allowReap
//   )

//   const { estimatedFee, unsigned, pendingTransferId } = useMemo(() => {
//     return data ?? { estimatedFee: null, unsigned: null, pendingTransferId: null }
//   }, [data])

//   return (
//     <div
//       className={classNames("inline-flex h-[1.7rem] items-center", isRefetching && "animate-pulse")}
//     >
//       <>
//         {isLoading && <LoaderIcon className="animate-spin-slow mr-2 inline align-text-top" />}
//         {estimatedFee && feeToken && <TokensAndFiat planck={estimatedFee} tokenId={feeToken.id} />}
//         {error && (
//           <WithTooltip tooltip={(error as Error).message}>
//             <span className="text-alert-warn">Failed to estimate fee</span>
//           </WithTooltip>
//         )}
//       </>
//     </div>
//   )
// }

const SendButton = () => {
  const { tokenId } = useSendFundsWizard()
  const { signMethod, errorMessage, isReady, send, isProcessing } = useSendFundsConfirm()
  const token = useToken(tokenId)

  return (
    <Suspense fallback={null}>
      {errorMessage && (
        <div className="text-alert-warn bg-grey-900 flex w-full items-center gap-5 rounded-sm px-5 py-6 text-xs">
          <AlertCircleIcon className="text-lg" />
          <div>{errorMessage}</div>
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
  const { tokenId } = useSendFundsWizard()
  const token = useToken(tokenId)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

  const { evmTransaction } = useSendFundsConfirm()

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
        <div className="text-body-secondary">Estimated Fee</div>
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
  const { tokenId } = useSendFundsWizard()
  const { subTransaction } = useSendFundsConfirm()
  const feeToken = useFeeToken(tokenId)

  if (!subTransaction) return null

  const { isRefetching, isLoading, partialFee, error } = subTransaction

  return (
    <div className="mt-4 flex h-[1.7rem] items-center justify-between gap-8 text-xs">
      <div className="text-body-secondary">Estimated Fee</div>
      <div className="text-body">
        <div
          className={classNames(
            "inline-flex h-[1.7rem] items-center",
            isRefetching && "animate-pulse"
          )}
        >
          <>
            {isLoading && <LoaderIcon className="animate-spin-slow mr-2 inline align-text-top" />}
            {partialFee && feeToken && <TokensAndFiat planck={partialFee} tokenId={feeToken.id} />}
            {error && (
              <WithTooltip tooltip={(error as Error).message}>
                <span className="text-alert-warn">Failed to estimate fee</span>
              </WithTooltip>
            )}
          </>
        </div>
      </div>
    </div>
  )
}

const FeeSummary = () => {
  const { tokenId } = useSendFundsWizard()
  const token = useToken(tokenId)

  if (isEvmToken(token)) return <EvmFeeSummary />
  return <SubFeeSummary />
}

export const SendFundsConfirmForm = () => {
  const { from, to } = useSendFundsWizard()

  return (
    <SendFundsConfirmProvider>
      <div className="flex h-full w-full flex-col items-center px-12 py-8">
        <div className="text-lg font-bold">You are sending</div>
        <div className="mt-24 w-full grow">
          <div className="bg-grey-900 text-body-secondary space-y-4 rounded px-8 py-4 leading-[140%]">
            <div className="flex h-12 items-center justify-between gap-8">
              <div className="text-body-secondary">Amount</div>
              <div className="text-body h-12">
                <TokenDisplay />
              </div>
            </div>
            <div className="flex h-12 items-center justify-between gap-8">
              <div className="text-body-secondary">From</div>
              <div className="text-body overflow-hidden">
                <AddressDisplay address={from} />
              </div>
            </div>
            <div className="flex h-12 items-center justify-between gap-8">
              <div className="text-body-secondary">To</div>
              <div className="text-body overflow-hidden">
                <AddressDisplay address={to} />
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
    </SendFundsConfirmProvider>
  )
}
