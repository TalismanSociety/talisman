import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { useNetwork } from "@talismn/balances-react"
import { useQuery } from "@tanstack/react-query"
import { notify } from "@ui/components/Notifications"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import type { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { QuoteProvider } from "@ui/domains/Swap/components/QuoteProvider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useRemoteConfig } from "@ui/state/remoteConfig"
import { useSolanaConnection } from "@ui/util/solana/useSolanaConnection"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { EstimateGasExecutionError } from "viem"
import { useConfirmReadiness, useSwapPostSubmit, useSwapTxInfo } from "../hooks/useSwapConfirmation"
import { useSwap } from "../SwapProvider"
import type {
  SwapModuleTransaction,
  SwapTransactionContext,
} from "../swap-modules/common.swap-module"
import { hasEthFeeEstimateError } from "./swapFeeEstimate"

export const SwapConfirmActions = () => {
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
    erc20Approval: { data: approvalData, loading: approvalLoading, approveTx },
  } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)
  const fromNetwork = useNetworkById(fromToken?.networkId)
  const {
    swaps: { lifi: lifiConfig },
  } = useRemoteConfig()

  const needsApproval = !approvalLoading && approvalData !== null
  const isReady = useConfirmReadiness(swapView)

  const publicClient = usePublicClient(approvalData?.chainId?.toString())
  const [isApproving, setIsApproving] = useState(false)

  const approvalTxInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!fromTokenId || !approvalData) return
    return {
      type: "approve-erc20",
      tokenId: fromTokenId,
      contractAddress: approvalData.contractAddress,
      amount: approvalData.amount.toString(),
    }
  }, [approvalData, fromTokenId])

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
      if (!publicClient) return

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

  const substrateNetwork = useNetwork(fromToken?.networkId ?? undefined)
  const existentialDeposit = useExistentialDeposit(substrateNetwork?.nativeTokenId)
  const allowReap = useMemo(
    () =>
      !!fromBalance &&
      fromAmount !== null &&
      (!existentialDeposit ||
        fromBalance.transferable.planck - fromAmount < existentialDeposit.planck),
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
      subProtocol,
      allowReap,
      approvalCounter,
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

      const context: SwapTransactionContext = sapi
        ? { platform: "polkadot", sapi, allowReap }
        : solanaConnection
          ? { platform: "solana", connection: solanaConnection }
          : { platform: "ethereum" }

      const transaction = await swapModule.getTransaction({
        fromTokenId,
        fromAddress,
        exchange: exchange?.data ?? selectedQuote,
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
    fromLifiChainId:
      swapModule?.protocol === "lifi" && fromToken?.networkId
        ? fromToken.networkId === "solana-mainnet"
          ? lifiConfig.solanaChainId
          : +fromToken.networkId
        : undefined,
    toLifiChainId:
      swapModule?.protocol === "lifi" && toToken?.networkId
        ? toToken.networkId === "solana-mainnet"
          ? lifiConfig.solanaChainId
          : +toToken.networkId
        : undefined,
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
    return fromAmount > fromBalance.transferable.planck
  }, [fromAmount, fromBalance?.transferable.planck])

  const isDisabled = useMemo(
    () =>
      !isReady ||
      !toAmount ||
      toAmount === 0n ||
      !fromAddress ||
      !toAddress ||
      isInsufficientBalance !== false ||
      isExchangeLoading ||
      !swapTx,
    [fromAddress, isExchangeLoading, isInsufficientBalance, isReady, swapTx, toAddress, toAmount]
  )

  const activeTransaction: SwapModuleTransaction | null = useMemo(() => {
    if (needsApproval && approveTx) return { platform: "ethereum", transaction: approveTx }
    return transaction
  }, [approveTx, needsApproval, transaction])

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
      case "solana":
        // Solana base fee is 5000 lamports per signature, predictable and very low
        return "5000"
      default:
        return null
    }
  }, [
    activeTransaction,
    approvalEthTx.txDetails,
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
      case "ethereum":
        return hasEthFeeEstimateError({
          exchangeError,
          ethError: needsApproval ? approvalEthTx.error : swapEthTx.error,
          txDetails: needsApproval ? approvalEthTx.txDetails : swapEthTx.txDetails,
        })
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
      <div className="relative flex min-h-[4.48rem] w-full flex-col gap-4 rounded bg-grey-900 px-8 py-6">
        <QuoteProvider />
        {fromToken?.platform === "ethereum" ? (
          <div className="flex h-11 items-center justify-between gap-8">
            <div className="text-body-secondary text-xs">{t("Priority")}</div>
            <div>
              {activeEthTx.transaction &&
                activeEthTx.txDetails &&
                activeFeeTokenId &&
                activeEthTx.priority && (
                  <EthFeeSelect
                    className="h-10"
                    tx={activeEthTx.transaction}
                    tokenId={activeFeeTokenId}
                    drawerContainerId="swap-modal"
                    gasSettingsByPriority={activeEthTx.gasSettingsByPriority}
                    priority={activeEthTx.priority}
                    txDetails={activeEthTx.txDetails}
                    networkUsage={activeEthTx.networkUsage}
                    setCustomSettings={activeEthTx.setCustomSettings}
                    onChange={activeEthTx.setPriority}
                  />
                )}
            </div>
          </div>
        ) : null}
        <div className="flex h-11 items-center justify-between gap-8">
          <div className="whitespace-nowrap text-body-secondary text-xs">
            {t("Estimated TX Fee")}
          </div>
          {hasFeeError ? (
            <div className="truncate text-alert-error text-xs">{t("Failed to estimate fee")}</div>
          ) : isFeeLoading ? (
            <div className="animate-pulse rounded-xs bg-body-disabled text-body-disabled text-xs">
              0.0000 TKN ($0.00)
            </div>
          ) : feePlanck && activeFeeTokenId ? (
            <TokensAndFiat
              className="text-body-secondary text-xs"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
              tokenId={activeFeeTokenId}
              planck={feePlanck}
            />
          ) : null}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8 pb-12">
        {!needsApproval && exchangeError && (
          <div
            role="alert"
            className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny"
          >
            {t("Error loading transaction:")} {String(exchangeError)}
          </div>
        )}

        {needsApproval ? (
          <TxSubmitButton
            containerId="swap-modal"
            tx={approvalTx}
            label={t("Approve ERC20")}
            onSubmit={onApprovalSubmitted}
            disabled={!isReady || !approvalTx}
            isProcessing={isApproving}
          />
        ) : (
          <TxSubmitButton
            containerId="swap-modal"
            tx={swapTx}
            label={t("Confirm Swap")}
            onSubmit={onSwapSubmitted}
            disabled={isDisabled}
            isProcessing={isExchangeLoading}
          />
        )}
      </div>
    </>
  )
}
