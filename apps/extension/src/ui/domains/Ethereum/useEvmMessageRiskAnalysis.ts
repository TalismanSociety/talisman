import { EvmSignTypedDataData, ScanMessageEvm200Response } from "@blowfishxyz/api-client/v20230605"
import {
  BlowfishEvmChainInfo,
  EthSignMessageMethod,
  getBlowfishChainInfo,
  getBlowfishClient,
} from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useMemo, useState } from "react"

import { RisksReview, useRisksReview } from "./useRisksReview"

export type EvmMessageRiskAnalysis = {
  type: "message"
  isAvailable: boolean
  isValidating: boolean
  result: ScanMessageEvm200Response | null | undefined
  error: unknown
  validate: (() => void) | undefined
  chainInfo: BlowfishEvmChainInfo | null
  review: RisksReview
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

const isCompatiblePayload = (
  method: EthSignMessageMethod | undefined,
  message: string | undefined
) => {
  if (!method || !message) return false

  switch (method) {
    case "personal_sign":
      return true
    case "eth_signTypedData":
    case "eth_signTypedData_v4":
      return !!getTypedDataPayload(message)
    default:
      return false
  }
}

export const useEvmMessageRiskAnalysis = (
  evmNetworkId: EvmNetworkId | undefined,
  method: EthSignMessageMethod | undefined,
  message: string | undefined,
  account: string | undefined,
  url?: string
): EvmMessageRiskAnalysis => {
  const [autoValidate, setAutoValidate] = useState(true) // TODO settingsStore.get("autoValidateTransactions")

  const origin = useMemo(() => {
    if (url) {
      try {
        return new URL(url).origin
      } catch (err) {
        // ignore
      }
    }
    return window.location.origin // fallback to extension's origin
  }, [url])

  const chainInfo = useMemo(() => {
    if (!evmNetworkId || !method || !message || !account) return null
    return getBlowfishChainInfo(evmNetworkId)
  }, [account, evmNetworkId, message, method])

  const isAvailable = useMemo(
    () => !!chainInfo && !!account && isCompatiblePayload(method, message),
    [account, chainInfo, message, method]
  )

  const {
    isLoading,
    data: result,
    error,
  } = useQuery({
    queryKey: ["useScanTransaction", evmNetworkId, method, message, account, autoValidate, origin],
    queryFn: () => {
      if (!evmNetworkId || !method || !message || !account || !autoValidate) return null
      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

      // TODO remove
      log.debug("querying blowfish", { evmNetworkId, method, message, account, origin })

      switch (method) {
        case "personal_sign":
          return client.scanMessage(message, account, { origin })
        case "eth_signTypedData":
        case "eth_signTypedData_v4": {
          const payload = getTypedDataPayload(message)
          if (!payload) return null
          //console.log("sign typed data payload", payload)
          return client.scanSignTypedData(payload, account, { origin })
        }
        default:
          return null
      }
    },
    enabled: !!method && !!message && !!account && !!evmNetworkId && autoValidate,
    refetchInterval: false,
    retry: false,
  })

  const review = useRisksReview(result?.action)

  return useMemo(
    () => ({
      type: "message",
      isAvailable,
      isValidating: isAvailable && autoValidate && isLoading,
      result,
      error,
      validate: isAvailable && autoValidate ? undefined : () => setAutoValidate(true),
      chainInfo,
      review,
    }),
    [autoValidate, chainInfo, error, isAvailable, isLoading, result, review]
  )
}
