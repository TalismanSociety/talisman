import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { EditIcon } from "@talismn/icons"
import { useQuery } from "@tanstack/react-query"
import { notify } from "@ui/components/Notifications"
import { Skeleton } from "@ui/components/Skeleton"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import type { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { QuoteDuration } from "@ui/domains/Swap/components/QuoteDuration"
import { QuoteExchangeRate } from "@ui/domains/Swap/components/QuoteExchangeRate"
import { QuoteProvider } from "@ui/domains/Swap/components/QuoteProvider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useSolanaConnection } from "@ui/util/solana/useSolanaConnection"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { EstimateGasExecutionError } from "viem"
import { useConfirmReadiness, useSwapPostSubmit, useSwapTxInfo } from "../hooks/useSwapConfirmation"
import { useSwapSlippage } from "../hooks/useSwapSlippage"
import { useSwap } from "../SwapProvider"
import type {
  SwapModuleTransaction,
  SwapTransactionContext,
} from "../swap-modules/common.swap-module"
import { SwapSlippageDrawer } from "./SwapSlippageDrawer"

export const SwapConfirmActions: FC<{ containerId: string }> = ({ containerId }) => {
  const { t } = useTranslation()
  const {
    swapView,
    fromBalance,
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
    approvalCounter,
    incrementApprovalCounter,
    erc20Approval: { data: approvalData, loading: approvalLoading, approveTx, needsRevoke },
  } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)
  const fromNetwork = useNetworkById(fromToken?.networkId)

  const needsApproval = !approvalLoading && approvalData !== null
  const isReady = useConfirmReadiness(swapView)
  const [slippagePercent] = useSwapSlippage()
  const slippageDrawer = useOpenClose()
  const supportsSlippage = swapModule?.supportsSlippageSetting === true

  // Increments each time the confirm view is entered, forcing a fresh exchange query
  const confirmEntryCounter = useRef(0)
  useEffect(() => {
    if (swapView === "confirm") confirmEntryCounter.current++
  }, [swapView])

  const publicClient = usePublicClient(approvalData?.chainId?.toString())
  const [isApproving, setIsApproving] = useState(false)
  const [hasSubmittedApproval, setHasSubmittedApproval] = useState(false)

  const approvalTxInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!fromTokenId || !approvalData) return
    return {
      type: "approve-erc20",
      tokenId: fromTokenId,
      contractAddress: approvalData.contractAddress,
      amount: needsRevoke ? "0" : approvalData.amount.toString(),
    }
  }, [approvalData, fromTokenId, needsRevoke])

  const approvalEthTx = useEthTransaction(approveTx ?? undefined, fromToken?.networkId, false)

  const approvalTx = useMemo<TxSubmitButtonTransaction | null>(() => {
    if (!fromToken?.networkId || !approvalEthTx.transaction || !approvalTxInfo) return null
    return {
      platform: "ethereum",
      networkId: fromToken.networkId,
      payload: approvalEthTx.transaction,
      txInfo: approvalTxInfo,
    }
  }, [approvalEthTx.transaction, approvalTxInfo, fromToken?.networkId])

  const onApprovalSubmitted = useCallback(
    async (txId: string) => {
      if (!publicClient) {
        // biome-ignore lint/suspicious/noConsole: intentional warning for debugging null publicClient
        console.warn("publicClient unavailable for approval receipt polling, skipping wait")
        incrementApprovalCounter()
        return
      }

      setHasSubmittedApproval(true)
      setIsApproving(true)
      try {
        const approved = await publicClient.waitForTransactionReceipt({
          hash: txId as `0x${string}`,
        })
        if (approved.status === "success") incrementApprovalCounter()
        else throw new Error("Approval reverted")
      } catch (cause) {
        notify({
          title:
            cause instanceof EstimateGasExecutionError
              ? t("Insufficient gas for approval")
              : t("Approval failed"),
          type: "error",
          subtitle: (cause as Error)?.message?.slice(0, 100),
        })
      } finally {
        setIsApproving(false)
      }
    },
    [incrementApprovalCounter, publicClient, t]
  )

  const substrateNetwork = useNetworkById(fromToken?.networkId ?? undefined)
  const existentialDeposit = useExistentialDeposit(substrateNetwork?.nativeTokenId)
  const allowReap = useMemo(
    () =>
      !!fromBalance &&
      fromAmount !== null &&
      !!existentialDeposit &&
      fromBalance.transferable.planck - fromAmount < existentialDeposit.planck,
    [existentialDeposit, fromAmount, fromBalance]
  )

  const { data: sapi } = useScaleApi(
    fromToken?.platform === "polkadot" ? fromToken.networkId : null
  )

  const solanaConnection = useSolanaConnection(
    fromToken?.platform === "solana" ? fromToken.networkId : null
  )

  const exchangeAndTransactionQuery = useQuery({
    queryKey: [
      "swap-exchange-transaction",
      swapModule?.protocol,
      fromTokenId,
      toTokenId,
      fromAddress,
      toAddress,
      fromAmount?.toString(),
      selectedQuote?.protocol,
      selectedQuote?.subProtocol,
      selectedQuote?.outputAmountBN?.toString(),
      subProtocol,
      allowReap,
      approvalCounter,
      supportsSlippage ? slippagePercent.toString() : "",
      confirmEntryCounter.current,
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

      // For modules that don't create an exchange (e.g. LI.FI returns null) but support
      // slippage, fetch a fresh quote so the route reflects the user's current slippage.
      // The main quote manager intentionally omits slippage from its cache key so that
      // editing slippage on the confirm screen doesn't destabilise quote selection.
      let exchangeQuote: unknown = exchange?.data ?? null
      if (!exchangeQuote && supportsSlippage) {
        const freshQuotes = await swapModule.getQuote(
          {
            fromTokenId,
            toTokenId,
            fromAmount,
            fromAddress,
            toAddress,
            selectedSubProtocol: subProtocol,
          },
          signal
        )
        if (signal.aborted) throw new Error("Aborted")

        const quotesArray = freshQuotes
          ? Array.isArray(freshQuotes)
            ? freshQuotes
            : [freshQuotes]
          : []

        // Prefer the route matching the user's selected protocol/subProtocol
        exchangeQuote =
          quotesArray.find(
            (q) =>
              q.protocol === selectedQuote?.protocol &&
              (!q.subProtocol || q.subProtocol === selectedQuote?.subProtocol)
          ) ??
          quotesArray[0] ??
          null
      }

      const context: SwapTransactionContext = sapi
        ? { platform: "polkadot", sapi, allowReap }
        : solanaConnection
          ? { platform: "solana", connection: solanaConnection }
          : { platform: "ethereum" }

      const transaction = await swapModule.getTransaction({
        fromTokenId,
        fromAddress,
        exchange: exchangeQuote ?? selectedQuote,
        context,
      })

      if (signal.aborted) throw new Error("Aborted")

      return { exchange, transaction }
    },
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
      !needsApproval &&
      (fromToken?.platform !== "polkadot" || !!sapi) &&
      (fromToken?.platform !== "solana" || !!solanaConnection),
    retry: false,
  })

  const exchange = exchangeAndTransactionQuery.data?.exchange
  const transaction = exchangeAndTransactionQuery.data?.transaction ?? null
  const isExchangeLoading = exchangeAndTransactionQuery.isLoading
  const exchangeError = exchangeAndTransactionQuery.error

  const swapEthTx = useEthTransaction(
    transaction?.platform === "ethereum" ? transaction.transaction : undefined,
    fromToken?.networkId,
    false
  )

  const substrateFee = useGetFeeEstimate({
    sapi,
    payload:
      !needsApproval && transaction?.platform === "polkadot" ? transaction.payload : undefined,
  })

  const txInfo = useSwapTxInfo({
    exchange: exchange?.data as { id: string } | undefined,
    fromTokenId,
    toTokenId,
    fromAmount,
    toAmount,
    toAddress,
    protocol: swapModule?.protocol,
    subProtocol,
  })

  const swapTx = useMemo<TxSubmitButtonTransaction | null>(() => {
    if (!transaction || !txInfo) return null

    switch (transaction.platform) {
      case "ethereum":
        if (!fromToken?.networkId || !swapEthTx.transaction) return null
        return {
          platform: "ethereum",
          networkId: fromToken.networkId,
          payload: swapEthTx.transaction,
          txInfo,
        }
      case "polkadot":
        return {
          platform: "polkadot",
          payload: transaction.payload,
          txMetadata: transaction.txMetadata,
          txInfo,
        }
      case "solana":
        if (!fromToken?.networkId) return null
        return {
          platform: "solana",
          networkId: fromToken.networkId,
          payload: transaction.transaction,
          txInfo,
        }
      default:
        return null
    }
  }, [fromToken?.networkId, swapEthTx.transaction, transaction, txInfo])

  const onSwapSubmitted = useSwapPostSubmit({
    fromNetworkId: fromToken?.networkId,
    toNetworkId: toToken?.networkId,
    toTokenId,
    txInfo,
    gotoSubmitted,
  })

  const isInsufficientBalance = useMemo(() => {
    if (!fromBalance?.transferable.planck || !fromAmount) return undefined
    const gasBuffer = BigInt(selectedQuote?.maxNativeTokenGasBuffer ?? "0")
    return fromAmount + gasBuffer > fromBalance.transferable.planck
  }, [fromAmount, fromBalance?.transferable.planck, selectedQuote?.maxNativeTokenGasBuffer])

  const activeTransaction: SwapModuleTransaction | null = useMemo(() => {
    if (needsApproval && approveTx) return { platform: "ethereum", transaction: approveTx }
    return transaction
  }, [approveTx, needsApproval, transaction])

  const errorMessage = useMemo<string | null>(() => {
    if (exchangeError) {
      // biome-ignore lint/suspicious/noExplicitAny: shape is unknown but may extend viem error
      const anyError = exchangeError as any
      return anyError?.shortMessage || anyError?.message || t("Transaction is likely to fail")
    }
    if (needsApproval) return approvalEthTx.errorDetails || null
    return swapEthTx.error || substrateFee.error?.message || null
  }, [
    needsApproval,
    approvalEthTx.errorDetails,
    exchangeError,
    swapEthTx.error,
    substrateFee.error?.message,
    t,
  ])

  const isDisabled = useMemo(
    () =>
      !isReady ||
      !toAmount ||
      toAmount === 0n ||
      !fromAddress ||
      !toAddress ||
      isInsufficientBalance !== false ||
      isExchangeLoading ||
      !swapTx ||
      !!errorMessage,
    [
      fromAddress,
      isExchangeLoading,
      isInsufficientBalance,
      isReady,
      swapTx,
      toAddress,
      toAmount,
      errorMessage,
    ]
  )

  const activeFeeTokenId = fromNetwork?.nativeTokenId
  const activeEthTx = needsApproval ? approvalEthTx : swapEthTx

  const feePlanck = useMemo(() => {
    if (!activeTransaction) return null

    switch (activeTransaction.platform) {
      case "ethereum":
        return (
          (needsApproval
            ? approvalEthTx.txDetails
            : swapEthTx.txDetails
          )?.estimatedFee?.toString() ?? null
        )
      case "polkadot":
        return substrateFee.data?.toString() ?? null
      case "solana": {
        // Base fee: 5000 lamports per signature
        // SPL token transfers may also need ATA creation (~2,039,280 lamports rent)
        const baseFee = 5000n
        const isSplToken = fromToken?.platform === "solana" && fromToken.type !== "sol-native"
        const ataRent = isSplToken ? 2_039_280n : 0n
        return (baseFee + ataRent).toString()
      }
      default:
        return null
    }
  }, [
    activeTransaction,
    approvalEthTx.txDetails,
    fromToken,
    needsApproval,
    substrateFee.data,
    swapEthTx.txDetails,
  ])

  const isFeeLoading = useMemo(() => {
    if (!activeTransaction) return isExchangeLoading
    switch (activeTransaction.platform) {
      case "ethereum":
        return (needsApproval ? approvalEthTx.isLoading : swapEthTx.isLoading) || isExchangeLoading
      case "polkadot":
        return substrateFee.isLoading || isExchangeLoading
      default:
        return isExchangeLoading
    }
  }, [
    activeTransaction,
    approvalEthTx.isLoading,
    isExchangeLoading,
    needsApproval,
    substrateFee.isLoading,
    swapEthTx.isLoading,
  ])

  const hasFeeError = useMemo(() => {
    if (!activeTransaction) return false
    switch (activeTransaction.platform) {
      case "ethereum": {
        if (exchangeError) return true
        const ethError = needsApproval ? approvalEthTx.error : swapEthTx.error
        if (!ethError) return false
        // Transaction validation errors can coexist with a computed fee.
        // In that case we still want to display the fee estimate.
        return !(needsApproval ? approvalEthTx.txDetails : swapEthTx.txDetails)
      }
      case "polkadot":
        return Boolean(substrateFee.error || exchangeError)
      default:
        return Boolean(exchangeError)
    }
  }, [
    activeTransaction,
    approvalEthTx.error,
    approvalEthTx.txDetails,
    exchangeError,
    needsApproval,
    substrateFee.error,
    swapEthTx.error,
    swapEthTx.txDetails,
  ])

  return (
    <>
      <div className="relative flex min-h-[2.8rem] w-full flex-col gap-2 rounded bg-grey-900 px-8 py-6">
        <QuoteProvider />
        <QuoteDuration />
        <QuoteExchangeRate />
        {fromToken?.platform === "ethereum" ? (
          <div className="flex h-11 items-center justify-between gap-8">
            <div className="text-body-secondary text-xs">{t("Priority")}</div>
            <div>
              {activeEthTx.transaction &&
              activeEthTx.txDetails &&
              activeFeeTokenId &&
              activeEthTx.priority ? (
                <EthFeeSelect
                  className="h-10"
                  disabled={isApproving}
                  tx={activeEthTx.transaction}
                  tokenId={activeFeeTokenId}
                  drawerContainerId={containerId}
                  gasSettingsByPriority={activeEthTx.gasSettingsByPriority}
                  priority={activeEthTx.priority}
                  txDetails={activeEthTx.txDetails}
                  networkUsage={activeEthTx.networkUsage}
                  setCustomSettings={activeEthTx.setCustomSettings}
                  onChange={activeEthTx.setPriority}
                />
              ) : (
                <Skeleton className="inline-block h-10 w-40 rounded-[1em] text-xs"></Skeleton>
              )}
            </div>
          </div>
        ) : null}
        {supportsSlippage ? (
          <div className="flex h-11 items-center justify-between gap-8">
            <div className="whitespace-nowrap text-body-secondary text-xs">
              {t("Slippage Tolerance")}
            </div>
            <button
              type="button"
              onClick={slippageDrawer.open}
              className="flex cursor-pointer items-center gap-2 rounded-xl pl-2 font-light text-body text-xs"
            >
              <EditIcon />
              <div className={slippagePercent === 0 ? "text-alert-warn" : undefined}>
                {slippagePercent.toFixed(2)}%
              </div>
            </button>
          </div>
        ) : null}
        <div className="flex h-11 items-center justify-between gap-8">
          <div className="whitespace-nowrap text-body-secondary text-xs">
            {t("Estimated TX Fee")}
          </div>
          {hasFeeError ? (
            <div className="truncate text-alert-error text-xs">{t("Failed to estimate fee")}</div>
          ) : !isFeeLoading && feePlanck && activeFeeTokenId ? (
            <TokensAndFiat
              className="text-body-secondary text-xs"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
              tokenId={activeFeeTokenId}
              planck={feePlanck}
            />
          ) : (
            <Skeleton className="text-xs">0.0000 TKN ($0.00)</Skeleton>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-black/40 px-12 py-8 pb-12">
        {!!errorMessage && (
          <div
            role="alert"
            className="mb-10 w-full rounded-sm bg-black-tertiary px-8 py-4 text-red-400 text-tiny"
          >
            {errorMessage}
          </div>
        )}

        {!errorMessage && needsApproval && (
          <div
            role="alert"
            className="mb-10 w-full rounded-sm bg-black-tertiary px-8 py-4 text-body-secondary text-tiny"
          >
            {needsRevoke
              ? t(
                  "This token requires the existing approval to be revoked before a new one can be set. You will need to approve again after revoking."
                )
              : t("This token requires approval before it can be swapped.")}
          </div>
        )}

        {needsApproval ? (
          <TxSubmitButton
            containerId={containerId}
            tx={approvalTx}
            label={needsRevoke ? t("Revoke Approval") : t("Approve Spend")}
            onSubmit={onApprovalSubmitted}
            disabled={!isReady || !approvalTx || isDisabled}
            isProcessing={isApproving}
          />
        ) : (
          <TxSubmitButton
            containerId={containerId}
            tx={swapTx}
            label={t("Confirm Swap")}
            onSubmit={onSwapSubmitted}
            disabled={isDisabled}
            isProcessing={isExchangeLoading && hasSubmittedApproval}
          />
        )}
      </div>
      {supportsSlippage ? (
        <SwapSlippageDrawer
          containerId={containerId}
          isOpen={slippageDrawer.isOpen}
          onClose={slippageDrawer.close}
        />
      ) : null}
    </>
  )
}
