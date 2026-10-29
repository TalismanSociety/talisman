import { networkIdForAnalytics } from "@common/analytics/funds"
import { log } from "@common/log"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { getErrorMessage, isErrorOfName } from "@talismn/util"
import { track } from "@ui/api/track"
import { notify } from "@ui/components/Notifications"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { withPricing } from "@ui/domains/Ethereum/withPricing"
import type { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import { flows } from "@ui/hooks/analytics/flows"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { useSwap } from "../SwapProvider"

export const useQuoteApproval = () => {
  const { t } = useTranslation()
  const {
    fromTokenId,
    selectedModule,
    incrementApprovalCounter,
    approvalHash,
    setApprovalHash,
    erc20Approval: { data, loading, approveTx, needsRevoke },
  } = useSwap()
  const fromToken = useToken(fromTokenId ?? undefined)
  const fromNetwork = useNetworkById(fromToken?.networkId)
  const publicClient = usePublicClient(data?.chainId?.toString())
  const [isPending, setIsPending] = useState(false)
  const [failure, setFailure] = useState<string>()

  const isNeeded = !loading && data !== null
  const amount = data ? (needsRevoke ? 0n : data.amount) : undefined

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!fromTokenId || !data || amount === undefined) return
    return {
      type: "approve-erc20",
      tokenId: fromTokenId,
      contractAddress: data.contractAddress,
      amount: amount.toString(),
    }
  }, [amount, data, fromTokenId])

  const ethTx = useEthTransaction(approveTx ?? undefined, fromToken?.networkId, false)

  const tx = useMemo<TxSubmitButtonTransaction | null>(() => {
    if (!fromToken?.networkId || !ethTx.transaction || !txInfo) return null
    return {
      platform: "ethereum",
      networkId: fromToken.networkId,
      payload: ethTx.transaction,
      txInfo: withPricing(txInfo, { priority: ethTx.priority, txDetails: ethTx.txDetails }),
    }
  }, [ethTx.transaction, ethTx.priority, ethTx.txDetails, txInfo, fromToken?.networkId])

  const protocol = selectedModule?.protocol
  const reportFailure = useCallback(
    (cause: unknown) => {
      if (protocol) flows.swap.failed(cause, { protocol, phase: "approval" })
    },
    [protocol]
  )

  const onError = useCallback(
    (cause: unknown) => {
      setFailure(getErrorMessage(cause, t("Failed to submit")))
      reportFailure(cause)
    },
    [reportFailure, t]
  )

  const onSubmit = useCallback(
    async (txId: string) => {
      const hash = txId as Hex
      setApprovalHash(hash)
      setFailure(undefined)
      if (protocol)
        track("swap_approval_submitted", {
          protocol,
          network_id: networkIdForAnalytics(fromNetwork),
          is_revoke: needsRevoke,
        })
      if (!publicClient) {
        log.warn("publicClient unavailable for approval receipt polling, skipping wait")
        incrementApprovalCounter()
        return
      }

      setIsPending(true)
      try {
        const approved = await publicClient.waitForTransactionReceipt({ hash })
        if (approved.status === "success") incrementApprovalCounter()
        else throw new Error("Approval reverted")
      } catch (cause) {
        const title = isErrorOfName(cause, "EstimateGasExecutionError")
          ? t("Insufficient gas for approval")
          : t("Approval failed")
        notify({
          title,
          type: "error",
          subtitle: getErrorMessage(cause, t("Unknown error")).slice(0, 100),
          cause,
        })
        setFailure(title)
        reportFailure(cause)
      } finally {
        setIsPending(false)
      }
    },
    [
      fromNetwork,
      incrementApprovalCounter,
      needsRevoke,
      protocol,
      publicClient,
      reportFailure,
      setApprovalHash,
      t,
    ]
  )

  return {
    isChecking: loading,
    isNeeded,
    isPending,
    hash: approvalHash ?? undefined,
    /** a failure only matters while the allowance is still short */
    failure: isNeeded ? failure : undefined,
    /** what the approval sets the allowance to: zero when an existing one must be revoked first */
    amount,
    needsRevoke,
    approveTx,
    ethTx,
    tx,
    onSubmit,
    onError,
  }
}
