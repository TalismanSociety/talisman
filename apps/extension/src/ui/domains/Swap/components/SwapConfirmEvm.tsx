import { activeNetworksStore } from "@core/domains/balances/store.activeNetworks"
import { activeTokensStore } from "@core/domains/balances/store.activeTokens"
import { serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import type { EthPriorityOptionName } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { LoaderIcon } from "@talismn/icons"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { notify } from "@ui/components/Notifications"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { useSwap } from "@ui/domains/Swap/SwapProvider"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { EstimateGasExecutionError } from "viem"

import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { saveIdForMonitoring } from "../swap-modules/simpleswap-swap-module"
import type { useFastBalance } from "../swaps-port/useFastBalance"
import { FeeEstimateEvm } from "./FeeEstimateEvm"

export const SwapConfirmEvm = ({
  fastBalance,
}: {
  fastBalance: ReturnType<typeof useFastBalance>
}) => {
  const { t } = useTranslation()

  const {
    swapView,
    fromAddress,
    toAddress,
    fromAsset,
    toAsset,
    fromAmount,
    toAmount,
    selectedModule: swapModule,
    selectedQuote,
    selectedSubProtocol: subProtocol,
    resetForm,
  } = useSwap()

  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    if (swapView !== "confirm") return setIsReady(false)

    const timeout = setTimeout(() => setIsReady(true), 1_000)
    return () => clearTimeout(timeout)
  }, [swapView])

  const account = useAccountByAddress(fromAddress)

  // Fetch exchange + EVM transaction via useQuery
  const exchangeAndTxQuery = useQuery({
    queryKey: [
      "swap-exchange-evm",
      swapModule?.protocol,
      fromAsset?.id,
      toAsset?.id,
      fromAddress,
      toAddress,
      fromAmount.toString(),
      selectedQuote?.protocol,
    ],
    queryFn: async ({ signal }) => {
      if (!swapModule || !fromAsset || !toAsset || !fromAddress || !toAddress)
        throw new Error("Missing params")

      const exchange = await swapModule.createExchange({
        fromAsset,
        toAsset,
        fromAmount,
        fromAddress,
        toAddress,
      })
      if (signal.aborted) throw new Error("Aborted")

      let evmTx: import("viem").TransactionRequest | undefined
      if (fromAsset.networkType === "evm") {
        evmTx = await swapModule.getEvmTransaction({
          fromAsset,
          fromAddress,
          exchange: exchange ?? selectedQuote,
        })
      }
      if (signal.aborted) throw new Error("Aborted")

      return { exchange, evmTx }
    },
    enabled:
      !!swapModule &&
      !!fromAsset &&
      !!toAsset &&
      !!fromAddress &&
      !!toAddress &&
      swapView === "confirm" &&
      isReady,
    retry: false,
  })

  const exchange = exchangeAndTxQuery.data?.exchange
  const evmTx = exchangeAndTxQuery.data?.evmTx
  const isExchangeLoading = exchangeAndTxQuery.isLoading
  const exchangeError = exchangeAndTxQuery.error

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!fromAsset) return
    if (!toAsset) return
    if (!toAmount) return
    if (toAddress === null) return

    switch (swapModule?.protocol) {
      case "simpleswap":
        if (!exchange) return
        return {
          type: "swap-simpleswap",
          exchangeId: exchange.id,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
      case "stealthex":
        if (!exchange) return
        return {
          type: "swap-stealthex",
          exchangeId: exchange.id,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
      case "lifi":
        if (!subProtocol) return
        return {
          type: "swap-lifi",
          protocolName: subProtocol,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
    }
    throw new Error(`swapModule ${swapModule?.protocol} not supported`)
  }, [
    exchange,
    fromAmount,
    fromAsset,
    subProtocol,
    swapModule?.protocol,
    toAddress,
    toAmount,
    toAsset,
  ])

  // once the payload is sent to ledger, we must freeze it
  const [isPayloadLocked, setIsPayloadLocked] = useState(false)

  const {
    transaction,
    txDetails,
    priority,
    setPriority,
    networkUsage,
    gasSettingsByPriority,
    setCustomSettings,
  } = useEthTransaction(evmTx ?? undefined, fromAsset?.chainId.toString(), isPayloadLocked)

  const handleFeeChange = useCallback(
    (priority: EthPriorityOptionName) => {
      setPriority(priority)
      // setReady() // clear error from previous submit attempt
    },
    [setPriority]
  )

  const [isProcessing, setIsProcessing] = useState(false)

  const { close: closeSwapTokensModal } = useSwapTokensModal()
  const navigate = useNavigate()
  const send = useCallback(async () => {
    if (!transaction || !fromAsset) return

    setIsProcessing(true)
    try {
      const serialized = serializeTransactionRequest(transaction)
      const hash = await api.ethSignAndSend(fromAsset?.chainId.toString(), serialized, txInfo)

      if (txInfo && txInfo.type === "swap-simpleswap") saveIdForMonitoring(txInfo.exchangeId, hash)

      closeSwapTokensModal()
      resetForm()
      if (toAsset?.chainId) activeNetworksStore.setActive(String(toAsset.chainId), true)
      if (toAsset?.id) activeTokensStore.setActive(toAsset.id, true)
      navigate("/tx-history")
    } catch (cause) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.error(new Error("Failed to submit swap", { cause }))
      notify({
        title: `Failed to submit swap`,
        type: "error",
        subtitle: (cause as Error)?.message,
      })
    }
    setIsProcessing(false)
  }, [closeSwapTokensModal, fromAsset, navigate, resetForm, toAsset, transaction, txInfo])

  const sendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!transaction || !fromAsset) return

      setIsProcessing(true)
      try {
        const serialized = serializeTransactionRequest(transaction)
        const hash = await api.ethSendSigned(
          fromAsset?.chainId.toString(),
          serialized,
          signature,
          txInfo
        )

        if (txInfo && txInfo.type === "swap-simpleswap")
          saveIdForMonitoring(txInfo.exchangeId, hash)

        closeSwapTokensModal()
        resetForm()
        if (toAsset?.chainId) activeNetworksStore.setActive(String(toAsset.chainId), true)
        if (toAsset?.id) activeTokensStore.setActive(toAsset.id, true)
        navigate("/tx-history")
      } catch (cause) {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.error(new Error("Failed to submit swap", { cause }))
        notify({
          title: `Failed to submit swap`,
          type: "error",
          subtitle: (cause as Error)?.message,
        })
      }
      setIsProcessing(false)
    },
    [closeSwapTokensModal, fromAsset, navigate, resetForm, transaction, txInfo, toAsset]
  )

  const onSentToDevice = useCallback(() => setIsPayloadLocked(true), [])

  const fromEvmNetwork = useNetworkById(fromAsset?.chainId?.toString(), "ethereum")
  const gasTokenSymbol = useToken(fromEvmNetwork?.nativeTokenId)?.symbol ?? "ETH"

  return (
    <>
      <FeeEstimateEvm
        isLoading={isExchangeLoading}
        isError={!!exchangeError}
        fastBalance={fastBalance}
        transaction={transaction}
        txDetails={txDetails}
        isPayloadLocked={isPayloadLocked}
        gasSettingsByPriority={gasSettingsByPriority}
        setCustomSettings={setCustomSettings}
        priority={priority}
        handleFeeChange={handleFeeChange}
        networkUsage={networkUsage}
      />

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {exchangeError &&
          (exchangeError instanceof EstimateGasExecutionError ? (
            <div className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny">
              {t("Insufficient {{symbol}} available to pay for gas", { symbol: gasTokenSymbol })}
            </div>
          ) : (
            <div className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny">
              {t("Error loading transaction:")} {String(exchangeError)}
            </div>
          ))}

        {isExchangeLoading || isProcessing ? (
          <Button className="w-full" primary disabled>
            <LoaderIcon className="animate-spin-slow text-lg" />
          </Button>
        ) : account && account.type === "ledger-ethereum" && isReady && !!evmTx ? (
          <SignHardwareEthereum
            evmNetworkId={fromAsset?.chainId.toString()}
            account={account}
            method="eth_sendTransaction"
            payload={isReady && evmTx ? evmTx : null}
            onSigned={sendSigned}
            onSentToDevice={onSentToDevice}
            containerId="swap-modal"
          />
        ) : (
          <Button className="w-full" primary onClick={send} disabled={!isReady || !evmTx}>
            {t("Confirm Swap")}
          </Button>
        )}
      </div>
    </>
  )
}
