import { ScanTransactionsEvm200Response } from "@blowfishxyz/api-client/v20230605"
import {
  BlowfishEvmChainInfo,
  getBlowfishClient,
  serializeTransactionRequest,
} from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { sleep } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useCallback, useEffect, useRef } from "react"
import { TransactionRequest } from "viem"

import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"
import { RisksReview, useRisksReview } from "./useRisksReview"

export type EvmTransactionRiskAnalysis = {
  type: "transaction"
  shouldPromptAutoRiskScan: boolean
  isAvailable: boolean
  isValidating: boolean
  result: ScanTransactionsEvm200Response | null | undefined
  error: unknown
  chainInfo: BlowfishEvmChainInfo | null
  review: RisksReview
  launchScan: () => void
}

export const useEvmTransactionRiskAnalysis = (
  evmNetworkId: EvmNetworkId | undefined,
  tx: TransactionRequest | undefined,
  url?: string,
  disableAutoRiskScan?: boolean // defaults to value stored in settings
): EvmTransactionRiskAnalysis => {
  const {
    shouldPromptAutoRiskScan,
    shouldValidate,
    origin,
    chainInfo,
    isAvailable,
    isValidationRequested,
    setIsValidationRequested,
  } = useEvmRiskAnalysisBase(evmNetworkId, url, disableAutoRiskScan)

  const {
    isLoading,
    data: result,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "useEvmTransactionRiskAnalysis",
      evmNetworkId,
      tx && serializeTransactionRequest(tx),
      shouldValidate,
      origin,
    ],
    // TODO remove async
    queryFn: async () => {
      if (!evmNetworkId || !tx || !shouldValidate) return null
      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

      // TODO remove
      log.debug("querying blowfish", { evmNetworkId, tx, origin })

      // TODO remove
      await sleep(2000)

      return client.scanTransactions(
        [
          {
            data: tx.data,
            from: tx.from,
            to: tx.to ?? undefined,
            value: typeof tx.value === "bigint" ? tx.value.toString() : undefined,
          },
        ],
        tx.from,
        { origin }
      )
    },
    enabled: !!tx && !!evmNetworkId && shouldValidate,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    retry: false,
  })

  const review = useRisksReview(result?.action)

  const launchScan = useCallback(() => {
    if (isAvailable) {
      if (result) review.drawer.open()
      else if (isValidationRequested) refetch() // manual retry
      else setIsValidationRequested(true) // first manual attempt, enables useQuery hook
    }
  }, [isAvailable, isValidationRequested, refetch, result, review.drawer, setIsValidationRequested])

  const refAutoOpen = useRef(false)
  useEffect(() => {
    if (refAutoOpen.current || !isValidationRequested) return
    if (result) {
      refAutoOpen.current = true
      review.drawer.open()
    }
  }, [error, isValidationRequested, result, review.drawer])

  useEffect(() => {
    // TODO remove
    log.log("useEvmTransactionRiskAnalysis", {
      type: "message",
      isAvailable,
      isValidating: isAvailable && shouldValidate && isLoading,
      result,
      error,
      launchScan,
      chainInfo,
      review,
      shouldPromptAutoRiskScan,
      shouldValidate,
      isLoading,
    })
  }, [
    chainInfo,
    error,
    isAvailable,
    isLoading,
    launchScan,
    result,
    review,
    shouldPromptAutoRiskScan,
    shouldValidate,
  ])

  return {
    type: "transaction",
    isAvailable,
    isValidating: isAvailable && shouldValidate && isLoading,
    result,
    error,
    launchScan,
    chainInfo,
    review,
    shouldPromptAutoRiskScan,
  }
}
