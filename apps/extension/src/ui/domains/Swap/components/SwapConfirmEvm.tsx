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
import { FeeEstimateEvm } from "./FeeEstimateEvm"

export const SwapConfirmEvm = () => {
  const { t } = useTranslation()

  const {
    swapView,
    fromAddress,
    toAddress,
    fromTokenId,
    toTokenId,
    fromAmount,
    toAmount,
    selectedModule: swapModule,
    selectedQuote,
    selectedSubProtocol: subProtocol,
    resetForm,
  } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)

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
      fromTokenId,
      toTokenId,
      fromAddress,
      toAddress,
      fromAmount.toString(),
      selectedQuote?.protocol,
    ],
    queryFn: async ({ signal }) => {
      if (!swapModule || !fromTokenId || !toTokenId || !fromAddress || !toAddress)
        throw new Error("Missing params")

      const exchange = await swapModule.createExchange({
        fromTokenId,
        toTokenId,
        fromAmount,
        fromAddress,
        toAddress,
      })
      if (signal.aborted) throw new Error("Aborted")

      let evmTx: import("viem").TransactionRequest | undefined
      if (fromToken?.platform === "ethereum") {
        evmTx = await swapModule.getEvmTransaction({
          fromTokenId,
          fromAddress,
          exchange: exchange ?? selectedQuote,
        })
      }
      if (signal.aborted) throw new Error("Aborted")

      return { exchange, evmTx }
    },
    enabled:
      !!swapModule &&
      !!fromTokenId &&
      !!toTokenId &&
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
    if (!fromTokenId) return
    if (!toTokenId) return
    if (!toAmount) return
    if (toAddress === null) return

    switch (swapModule?.protocol) {
      case "simpleswap":
        if (!exchange) return
        return {
          type: "swap-simpleswap",
          exchangeId: exchange.id,
          fromTokenId,
          toTokenId,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
      case "stealthex":
        if (!exchange) return
        return {
          type: "swap-stealthex",
          exchangeId: exchange.id,
          fromTokenId,
          toTokenId,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
      case "lifi":
        if (!subProtocol) return
        return {
          type: "swap-lifi",
          protocolName: subProtocol,
          fromTokenId,
          toTokenId,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
    }
    throw new Error(`swapModule ${swapModule?.protocol} not supported`)
  }, [
    exchange,
    fromAmount,
    fromTokenId,
    subProtocol,
    swapModule?.protocol,
    toAddress,
    toAmount,
    toTokenId,
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
  } = useEthTransaction(evmTx ?? undefined, fromToken?.networkId, isPayloadLocked)

  const handleFeeChange = useCallback(
    (priority: EthPriorityOptionName) => {
      setPriority(priority)
    },
    [setPriority]
  )

  const [isProcessing, setIsProcessing] = useState(false)

  const { close: closeSwapTokensModal } = useSwapTokensModal()
  const navigate = useNavigate()
  const send = useCallback(async () => {
    if (!transaction || !fromToken) return

    setIsProcessing(true)
    try {
      const serialized = serializeTransactionRequest(transaction)
      const hash = await api.ethSignAndSend(fromToken.networkId, serialized, txInfo)

      if (txInfo && txInfo.type === "swap-simpleswap") saveIdForMonitoring(txInfo.exchangeId, hash)

      closeSwapTokensModal()
      resetForm()
      if (toToken?.networkId) activeNetworksStore.setActive(toToken.networkId, true)
      if (toTokenId) activeTokensStore.setActive(toTokenId, true)
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
  }, [
    closeSwapTokensModal,
    fromToken,
    navigate,
    resetForm,
    toToken,
    toTokenId,
    transaction,
    txInfo,
  ])

  const sendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!transaction || !fromToken) return

      setIsProcessing(true)
      try {
        const serialized = serializeTransactionRequest(transaction)
        const hash = await api.ethSendSigned(fromToken.networkId, serialized, signature, txInfo)

        if (txInfo && txInfo.type === "swap-simpleswap")
          saveIdForMonitoring(txInfo.exchangeId, hash)

        closeSwapTokensModal()
        resetForm()
        if (toToken?.networkId) activeNetworksStore.setActive(toToken.networkId, true)
        if (toTokenId) activeTokensStore.setActive(toTokenId, true)
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
    [closeSwapTokensModal, fromToken, navigate, resetForm, transaction, txInfo, toToken, toTokenId]
  )

  const onSentToDevice = useCallback(() => setIsPayloadLocked(true), [])

  const fromEvmNetwork = useNetworkById(fromToken?.networkId, "ethereum")
  const gasTokenSymbol = useToken(fromEvmNetwork?.nativeTokenId)?.symbol ?? "ETH"

  return (
    <>
      <FeeEstimateEvm
        isLoading={isExchangeLoading}
        isError={!!exchangeError}
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
            evmNetworkId={fromToken?.networkId}
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
