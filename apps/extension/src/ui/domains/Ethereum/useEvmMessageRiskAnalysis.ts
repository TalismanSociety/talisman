import { EvmSignTypedDataData, ScanMessageEvm200Response } from "@blowfishxyz/api-client/v20230605"
import { BlowfishEvmChainInfo, EthSignMessageMethod, getBlowfishClient } from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { sleep } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useCallback, useEffect, useRef } from "react"

import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"
import { RisksReview, useRisksReview } from "./useRisksReview"

export type EvmMessageRiskAnalysis = {
  type: "message"
  shouldPromptAutoRiskScan: boolean
  isAvailable: boolean
  isValidating: boolean
  result: ScanMessageEvm200Response | null | undefined
  error: unknown
  chainInfo: BlowfishEvmChainInfo | null
  review: RisksReview
  launchScan: () => void
}

const getTypedDataPayload = (msg: string): EvmSignTypedDataData | null => {
  try {
    // parse and remove unsupported fields
    const { domain, message, primaryType, types } = JSON.parse(msg) as EvmSignTypedDataData
    return { domain, message, primaryType, types }
  } catch (err) {
    // most likely a text message
    return null
  }
}

export const useEvmMessageRiskAnalysis = (
  evmNetworkId: EvmNetworkId | undefined,
  method: EthSignMessageMethod | undefined,
  message: string | undefined,
  account: string | undefined,
  url?: string
): EvmMessageRiskAnalysis => {
  const {
    shouldPromptAutoRiskScan,
    shouldValidate,
    origin,
    chainInfo,
    isAvailable,
    isValidationRequested,
    setIsValidationRequested,
  } = useEvmRiskAnalysisBase(evmNetworkId, url)

  const {
    isLoading,
    data: result,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "useEvmMessageRiskAnalysis",
      evmNetworkId,
      method,
      message,
      account,
      shouldValidate,
      origin,
    ],
    // TODO remove async
    queryFn: async () => {
      if (!evmNetworkId || !method || !message || !account || !shouldValidate) return null
      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

      // TODO remove
      log.debug("querying blowfish", { evmNetworkId, method, message, account, origin })

      // TODO remove
      await sleep(2000)

      switch (method) {
        case "personal_sign":
          return client.scanMessage(message, account, { origin })
        case "eth_signTypedData":
        case "eth_signTypedData_v4": {
          const payload = getTypedDataPayload(message)
          if (!payload) return null
          return client.scanSignTypedData(payload, account, { origin })
        }
        default:
          throw new Error("Unsupported message type. Proceed with caution")
      }
    },
    enabled: !!method && !!message && !!account && !!evmNetworkId && shouldValidate,
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
      else if (error) refetch() // manual retry
      else setIsValidationRequested(true) // first manual attempt, enables useQuery hook
    }
  }, [error, isAvailable, refetch, result, review.drawer, setIsValidationRequested])

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
    log.log("useEvmMessageRiskAnalysis", {
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
    type: "message",
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
