import { serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import type { EthPriorityOptionName } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { LoaderIcon } from "@talismn/icons"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { notify } from "@ui/components/Notifications"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { useSwap } from "@ui/domains/Swap/SwapProvider"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { isUserRejectionError } from "@ui/util/isUserRejectionError"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { EstimateGasExecutionError } from "viem"
import { useConfirmReadiness, useSwapPostSubmit, useSwapTxInfo } from "../hooks/useSwapConfirmation"
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
    gotoSubmitted,
    erc20Approval: { data: approvalData, loading: approvalLoading, approveTx },
    incrementApprovalCounter,
  } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)

  const needsApproval = !approvalLoading && approvalData !== null
  const isReady = useConfirmReadiness(swapView)

  const account = useAccountByAddress(fromAddress)

  // --- ERC20 Approval Phase ---

  const [isApprovalPayloadLocked, setIsApprovalPayloadLocked] = useState(false)

  const approvalEthTx = useEthTransaction(
    approveTx ?? undefined,
    fromToken?.networkId,
    isApprovalPayloadLocked
  )

  const approvalTxInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!fromTokenId || !approvalData) return
    return {
      type: "approve-erc20",
      tokenId: fromTokenId,
      contractAddress: approvalData.contractAddress,
      amount: approvalData.amount.toString(),
    }
  }, [approvalData, fromTokenId])

  const publicClient = usePublicClient(approvalData?.chainId?.toString())

  const [isApproving, setIsApproving] = useState(false)

  const sendApproval = useCallback(async () => {
    if (!approvalEthTx.transaction || !fromToken || !publicClient) return

    setIsApproving(true)
    try {
      const serialized = serializeTransactionRequest(approvalEthTx.transaction)
      const hash = await api.ethSignAndSend(fromToken.networkId, serialized, approvalTxInfo)

      const approved = await publicClient.waitForTransactionReceipt({ hash })

      if (approved.status === "success") incrementApprovalCounter()
      if (approved.status === "reverted") throw new Error("Approval reverted")
    } catch (cause) {
      if (!isUserRejectionError(cause)) {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.error(new Error("Failed to approve ERC20", { cause }))
        notify({
          title:
            cause instanceof EstimateGasExecutionError
              ? t("Insufficient gas for approval")
              : t("Approval failed"),
          type: "error",
          subtitle:
            cause instanceof EstimateGasExecutionError
              ? undefined
              : (cause as Error)?.message?.slice(0, 100),
        })
      }
    } finally {
      setIsApproving(false)
    }
  }, [
    approvalEthTx.transaction,
    approvalTxInfo,
    fromToken,
    incrementApprovalCounter,
    publicClient,
    t,
  ])

  const sendApprovalSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!approvalEthTx.transaction || !fromToken || !publicClient) return

      setIsApproving(true)
      try {
        const serialized = serializeTransactionRequest(approvalEthTx.transaction)
        const hash = await api.ethSendSigned(
          fromToken.networkId,
          serialized,
          signature,
          approvalTxInfo
        )

        const approved = await publicClient.waitForTransactionReceipt({ hash })

        if (approved.status === "success") incrementApprovalCounter()
        if (approved.status === "reverted") throw new Error("Approval reverted")
      } catch (cause) {
        if (!isUserRejectionError(cause)) {
          // biome-ignore lint/suspicious/noConsole: legacy
          console.error(new Error("Failed to approve ERC20", { cause }))
          notify({
            title:
              cause instanceof EstimateGasExecutionError
                ? t("Insufficient gas for approval")
                : t("Approval failed"),
            type: "error",
            subtitle:
              cause instanceof EstimateGasExecutionError
                ? undefined
                : (cause as Error)?.message?.slice(0, 100),
          })
        }
      } finally {
        setIsApproving(false)
        setIsApprovalPayloadLocked(false)
      }
    },
    [
      approvalEthTx.transaction,
      approvalTxInfo,
      fromToken,
      incrementApprovalCounter,
      publicClient,
      t,
    ]
  )

  const onApprovalSentToDevice = useCallback(() => setIsApprovalPayloadLocked(true), [])

  const handleApprovalFeeChange = useCallback(
    (priority: EthPriorityOptionName) => {
      approvalEthTx.setPriority(priority)
    },
    [approvalEthTx]
  )

  // --- Swap Phase ---

  const exchangeAndTxQuery = useQuery({
    queryKey: [
      "swap-exchange-evm",
      swapModule?.protocol,
      fromTokenId,
      toTokenId,
      fromAddress,
      toAddress,
      fromAmount?.toString(),
      selectedQuote?.protocol,
    ],
    queryFn: async ({ signal }) => {
      if (!swapModule || !fromTokenId || !toTokenId || !fromAddress || !toAddress || !fromAmount)
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
    // Wait until we know the approval status and any required approval is done
    // before creating the exchange. Otherwise the swap tx gas estimation reverts
    // (transferFrom fails without allowance) and the query stays in error state.
    enabled:
      !!swapModule &&
      !!fromTokenId &&
      !!toTokenId &&
      !!fromAddress &&
      !!toAddress &&
      !!fromAmount &&
      swapView === "confirm" &&
      isReady &&
      !approvalLoading &&
      !needsApproval,
    retry: false,
  })

  const exchange = exchangeAndTxQuery.data?.exchange
  const evmTx = exchangeAndTxQuery.data?.evmTx
  const isExchangeLoading = exchangeAndTxQuery.isLoading
  const exchangeError = exchangeAndTxQuery.error

  const txInfo = useSwapTxInfo({
    exchange,
    fromTokenId,
    toTokenId,
    fromAmount,
    toAmount,
    toAddress,
    protocol: swapModule?.protocol,
    subProtocol,
  })

  const [isSwapPayloadLocked, setIsSwapPayloadLocked] = useState(false)

  // Skip swap gas estimation while approval is pending — the swap contract would
  // revert on transferFrom before the ERC20 allowance is set.
  const swapEthTx = useEthTransaction(
    needsApproval ? undefined : (evmTx ?? undefined),
    fromToken?.networkId,
    isSwapPayloadLocked
  )

  const handleSwapFeeChange = useCallback(
    (priority: EthPriorityOptionName) => {
      swapEthTx.setPriority(priority)
    },
    [swapEthTx]
  )

  const [isProcessing, setIsProcessing] = useState(false)

  const onSwapSubmitted = useSwapPostSubmit({
    fromNetworkId: fromToken?.networkId,
    toNetworkId: toToken?.networkId,
    toTokenId,
    txInfo,
    gotoSubmitted,
  })

  const send = useCallback(async () => {
    if (!swapEthTx.transaction || !fromToken || !txInfo) return

    setIsProcessing(true)
    try {
      const serialized = serializeTransactionRequest(swapEthTx.transaction)
      const hash = await api.ethSignAndSend(fromToken.networkId, serialized, txInfo)
      onSwapSubmitted(hash)
    } catch (cause) {
      if (!isUserRejectionError(cause)) {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.error(new Error("Failed to submit swap", { cause }))
        notify({
          title:
            cause instanceof EstimateGasExecutionError
              ? t("Insufficient gas to complete swap")
              : t("Failed to submit swap"),
          type: "error",
          subtitle:
            cause instanceof EstimateGasExecutionError
              ? undefined
              : (cause as Error)?.message?.slice(0, 100),
        })
      }
    }
    setIsProcessing(false)
  }, [fromToken, onSwapSubmitted, swapEthTx.transaction, t, txInfo])

  const sendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!swapEthTx.transaction || !fromToken || !txInfo) return

      setIsProcessing(true)
      try {
        const serialized = serializeTransactionRequest(swapEthTx.transaction)
        const hash = await api.ethSendSigned(fromToken.networkId, serialized, signature, txInfo)
        onSwapSubmitted(hash)
      } catch (cause) {
        if (!isUserRejectionError(cause)) {
          // biome-ignore lint/suspicious/noConsole: legacy
          console.error(new Error("Failed to submit swap", { cause }))
          notify({
            title:
              cause instanceof EstimateGasExecutionError
                ? t("Insufficient gas to complete swap")
                : t("Failed to submit swap"),
            type: "error",
            subtitle:
              cause instanceof EstimateGasExecutionError
                ? undefined
                : (cause as Error)?.message?.slice(0, 100),
          })
        }
      }
      setIsProcessing(false)
    },
    [fromToken, onSwapSubmitted, swapEthTx.transaction, t, txInfo]
  )

  const onSwapSentToDevice = useCallback(() => setIsSwapPayloadLocked(true), [])

  const fromEvmNetwork = useNetworkById(fromToken?.networkId, "ethereum")
  const gasTokenSymbol = useToken(fromEvmNetwork?.nativeTokenId)?.symbol ?? "ETH"

  // --- Select which phase to display ---
  const activeTx = needsApproval ? approvalEthTx : swapEthTx
  const activeIsLoading = needsApproval ? approvalLoading : isExchangeLoading
  const activeIsError = needsApproval ? false : !!exchangeError
  const activeHandleFeeChange = needsApproval ? handleApprovalFeeChange : handleSwapFeeChange
  const activeIsPayloadLocked = needsApproval ? isApprovalPayloadLocked : isSwapPayloadLocked

  return (
    <>
      <span className="sr-only" aria-live="polite">
        {isApproving ? t("Approving token...") : isProcessing ? t("Submitting swap...") : ""}
      </span>
      <FeeEstimateEvm
        isLoading={activeIsLoading}
        isError={activeIsError}
        transaction={activeTx.transaction}
        txDetails={activeTx.txDetails}
        isPayloadLocked={activeIsPayloadLocked}
        gasSettingsByPriority={activeTx.gasSettingsByPriority}
        setCustomSettings={activeTx.setCustomSettings}
        priority={activeTx.priority}
        handleFeeChange={activeHandleFeeChange}
        networkUsage={activeTx.networkUsage}
      />

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {!needsApproval &&
          exchangeError &&
          (exchangeError instanceof EstimateGasExecutionError ? (
            <div
              role="alert"
              className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny"
            >
              {t("Insufficient {{symbol}} available to pay for gas", { symbol: gasTokenSymbol })}
            </div>
          ) : (
            <div
              role="alert"
              className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny"
            >
              {t("Error loading transaction:")} {String(exchangeError)}
            </div>
          ))}

        {needsApproval ? (
          // --- Approval Phase ---
          isApproving ? (
            <Button className="w-full" primary disabled aria-label={t("Approving...")}>
              <LoaderIcon className="animate-spin-slow text-lg" />
            </Button>
          ) : account?.type === "ledger-ethereum" && isReady && approveTx ? (
            <SignHardwareEthereum
              evmNetworkId={fromToken?.networkId}
              account={account}
              method="eth_sendTransaction"
              payload={isReady && approveTx ? approveTx : null}
              onSigned={sendApprovalSigned}
              onSentToDevice={onApprovalSentToDevice}
              containerId="swap-modal"
            />
          ) : (
            <Button
              className="w-full"
              primary
              onClick={sendApproval}
              disabled={!isReady || !approveTx || !approvalEthTx.transaction}
            >
              {t("Approve ERC20")}
            </Button>
          )
        ) : // --- Swap Phase ---
        isExchangeLoading || isProcessing || (!evmTx && !exchangeError) ? (
          <Button className="w-full" primary disabled aria-label={t("Processing swap...")}>
            <LoaderIcon className="animate-spin-slow text-lg" />
          </Button>
        ) : account?.type === "ledger-ethereum" && isReady && !!evmTx ? (
          <SignHardwareEthereum
            evmNetworkId={fromToken?.networkId}
            account={account}
            method="eth_sendTransaction"
            payload={isReady && evmTx ? evmTx : null}
            onSigned={sendSigned}
            onSentToDevice={onSwapSentToDevice}
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
