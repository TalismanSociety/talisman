import { activeNetworksStore } from "@core/domains/balances/store.activeNetworks"
import { activeTokensStore } from "@core/domains/balances/store.activeTokens"
import { serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import type { EthPriorityOptionName } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { LoaderIcon } from "@talismn/icons"
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
import { saveAddressForQuest } from "../swap-modules/common.swap-module"
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
    toAmountLoadable: toAmount,
    selectedModuleLoadable,
    selectedQuoteLoadable,
    selectedSubProtocol: subProtocol,
    resetForm,
  } = useSwap()

  const swapModule =
    selectedModuleLoadable.state === "hasData" ? selectedModuleLoadable.data : undefined

  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    if (swapView !== "confirm") return setIsReady(false)

    const timeout = setTimeout(() => setIsReady(true), 1_000)
    return () => clearTimeout(timeout)
  }, [swapView])

  const account = useAccountByAddress(fromAddress)

  // Fetch exchange + EVM transaction via async calls on the swap module
  type ExchangeLoadable = import("../swaps.api").Loadable<{ id: string } | undefined>
  type EvmTxLoadable = import("../swaps.api").Loadable<
    import("viem").TransactionRequest | undefined
  >
  const [exchangeLoadable, setExchangeLoadable] = useState<ExchangeLoadable>({ state: "loading" })
  const [evmTxLoadable, setEvmTxLoadable] = useState<EvmTxLoadable>({ state: "loading" })

  useEffect(() => {
    if (
      !swapModule ||
      !fromAsset ||
      !toAsset ||
      !fromAddress ||
      !toAddress ||
      swapView !== "confirm"
    )
      return
    if (!isReady) return

    const controller = new AbortController()
    setExchangeLoadable({ state: "loading" })
    setEvmTxLoadable({ state: "loading" })

    const run = async () => {
      try {
        const exchange = await swapModule.createExchange({
          fromAsset,
          toAsset,
          fromAmount,
          fromAddress,
          toAddress,
        })
        if (controller.signal.aborted) return
        setExchangeLoadable({ state: "hasData", data: exchange })

        if (fromAsset.networkType !== "evm") return

        // For modules like LiFi where createExchange returns undefined,
        // use the selected quote data so getEvmTransaction can build the tx
        const selectedQuote =
          selectedQuoteLoadable.state === "hasData" &&
          selectedQuoteLoadable.data?.quote.state === "hasData"
            ? selectedQuoteLoadable.data.quote.data
            : undefined

        const evmTx = await swapModule.getEvmTransaction({
          fromAsset,
          fromAddress,
          exchange: exchange ?? selectedQuote,
        })
        if (controller.signal.aborted) return
        setEvmTxLoadable({ state: "hasData", data: evmTx })
      } catch (error) {
        if (controller.signal.aborted) return
        setExchangeLoadable({ state: "hasError", error })
        setEvmTxLoadable({ state: "hasError", error })
      }
    }
    run()

    return () => controller.abort()
  }, [
    swapModule,
    fromAsset,
    toAsset,
    fromAddress,
    toAddress,
    fromAmount,
    isReady,
    swapView,
    selectedQuoteLoadable,
  ])

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!fromAsset) return
    if (!toAsset) return
    if (toAmount.state !== "hasData") return
    if (toAmount.data === null) return
    if (toAddress === null) return

    switch (swapModule?.protocol) {
      case "simpleswap":
        if (exchangeLoadable.state !== "hasData") return
        if (!exchangeLoadable.data) return
        return {
          type: "swap-simpleswap",
          exchangeId: exchangeLoadable.data.id,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.planck.toString(),
          toAmount: toAmount.data.planck.toString(),
          to: toAddress,
        }
      case "stealthex":
        if (exchangeLoadable.state !== "hasData") return
        if (!exchangeLoadable.data) return
        return {
          type: "swap-stealthex",
          exchangeId: exchangeLoadable.data.id,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.planck.toString(),
          toAmount: toAmount.data.planck.toString(),
          to: toAddress,
        }
      case "lifi":
        if (!subProtocol) return
        return {
          type: "swap-lifi",
          protocolName: subProtocol,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.planck.toString(),
          toAmount: toAmount.data.planck.toString(),
          to: toAddress,
        }
    }
    throw new Error(`swapModule ${swapModule?.protocol} not supported`)
  }, [
    exchangeLoadable,
    fromAmount.planck,
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
  } = useEthTransaction(
    evmTxLoadable?.state === "hasData" ? (evmTxLoadable.data ?? undefined) : undefined,
    fromAsset?.chainId.toString(),
    isPayloadLocked
  )

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
      if (
        txInfo &&
        (txInfo?.type === "swap-simpleswap" || txInfo?.type === "swap-stealthex") &&
        fromAddress &&
        swapModule?.protocol
      )
        saveAddressForQuest(txInfo.exchangeId, fromAddress, swapModule.protocol)

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
  }, [
    closeSwapTokensModal,
    fromAddress,
    fromAsset,
    navigate,
    resetForm,
    swapModule?.protocol,
    toAsset,
    transaction,
    txInfo,
  ])

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
        if (
          txInfo &&
          (txInfo?.type === "swap-simpleswap" || txInfo?.type === "swap-stealthex") &&
          fromAddress &&
          swapModule?.protocol
        )
          saveAddressForQuest(txInfo.exchangeId, fromAddress, swapModule.protocol)

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
    [
      closeSwapTokensModal,
      fromAddress,
      fromAsset,
      navigate,
      resetForm,
      swapModule?.protocol,
      transaction,
      txInfo,
      toAsset,
    ]
  )

  const onSentToDevice = useCallback(() => setIsPayloadLocked(true), [])

  const fromEvmNetwork = useNetworkById(fromAsset?.chainId?.toString(), "ethereum")
  const gasTokenSymbol = useToken(fromEvmNetwork?.nativeTokenId)?.symbol ?? "ETH"

  return (
    <>
      <FeeEstimateEvm
        loadableState={evmTxLoadable?.state}
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
        {evmTxLoadable?.state === "hasError" &&
          (evmTxLoadable.error instanceof EstimateGasExecutionError ? (
            <div className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny">
              {t("Insufficient {{symbol}} available to pay for gas", { symbol: gasTokenSymbol })}
            </div>
          ) : (
            <div className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny">
              {t("Error loading transaction:")} {String(evmTxLoadable.error)}
            </div>
          ))}

        {evmTxLoadable?.state === "loading" || isProcessing ? (
          <Button className="w-full" primary disabled>
            <LoaderIcon className="animate-spin-slow text-lg" />
          </Button>
        ) : account &&
          account.type === "ledger-ethereum" &&
          isReady &&
          evmTxLoadable?.state === "hasData" ? (
          <SignHardwareEthereum
            evmNetworkId={fromAsset?.chainId.toString()}
            account={account}
            method="eth_sendTransaction"
            payload={isReady && evmTxLoadable?.state === "hasData" ? evmTxLoadable.data : null}
            onSigned={sendSigned}
            onSentToDevice={onSentToDevice}
            containerId="SwapTokensModalDialog"
          />
        ) : (
          <Button
            className="w-full"
            primary
            onClick={send}
            disabled={!isReady || evmTxLoadable?.state !== "hasData"}
          >
            {t("Confirm Swap")}
          </Button>
        )}
      </div>
    </>
  )
}
