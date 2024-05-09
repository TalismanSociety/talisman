import { EvmSignTypedDataData } from "@blowfishxyz/api-client/v20230605"
import { EthSignMessageMethod } from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"

import { getBlowfishClient } from "./blowfish"
import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"

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

type UseEvmMessageRiskAnalysisProps = {
  evmNetworkId: EvmNetworkId | undefined
  method: EthSignMessageMethod | undefined
  message: string | undefined
  account: string | undefined
  origin: string
  disableAutoRiskScan?: boolean
}

export const useEvmMessageRiskAnalysis = ({
  evmNetworkId,
  method,
  message,
  account,
  origin,
  disableAutoRiskScan,
}: UseEvmMessageRiskAnalysisProps) => {
  return useEvmRiskAnalysisBase({
    type: "message",
    evmNetworkId,
    disableAutoRiskScan,
    queryKey: ["useEvmMessageRiskAnalysis", evmNetworkId, method, message, account, origin],
    queryFn: () => {
      if (!evmNetworkId || !method || !message || !account) return null

      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

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
    enabled: !!method && !!message && !!account && !!evmNetworkId,
  })
}
