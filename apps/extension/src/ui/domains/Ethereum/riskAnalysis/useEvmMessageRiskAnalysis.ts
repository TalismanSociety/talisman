import { EvmSignTypedDataData } from "@blowfishxyz/api-client/v20230605"
import { EthSignMessageMethod, getBlowfishClient } from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"
import { useEvmRiskAnalysisOrigin } from "./useEvmRiskAnalysisOrigin"

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
  url?: string
  disableAutoRiskScan?: boolean
}

export const useEvmMessageRiskAnalysis = ({
  evmNetworkId,
  method,
  message,
  account,
  url,
  disableAutoRiskScan,
}: UseEvmMessageRiskAnalysisProps) => {
  const origin = useEvmRiskAnalysisOrigin(url)

  return useEvmRiskAnalysisBase({
    type: "message",
    evmNetworkId,
    disableAutoRiskScan,
    queryKey: ["useEvmMessageRiskAnalysis", evmNetworkId, method, message, account, url],
    // TODO remove async
    queryFn: async () => {
      if (!evmNetworkId || !method || !message || !account) return null

      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

      // TODO remove
      log.debug("querying blowfish", { evmNetworkId, method, message, account, origin })

      // // TODO remove
      // await sleep(2000)

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
