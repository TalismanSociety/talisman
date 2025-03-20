import { EvmNetworkId } from "@talismn/chaindata-provider"
import { log, RISK_ANALYSIS_API_URL } from "extension-shared"
import urlJoin from "url-join"

import { EthSignMessageMethod } from "@extension/core"
import { useFeatureFlag } from "@ui/state"

import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"

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
  const enabled = useFeatureFlag("RISK_ANALYSIS")

  return useEvmRiskAnalysisBase({
    type: "message",
    evmNetworkId,
    disableAutoRiskScan,
    queryKey: ["useEvmMessageRiskAnalysis", evmNetworkId, method, message, account, origin],
    queryFn: async () => {
      if (!evmNetworkId || !method || !message || !account) return null

      switch (method) {
        case "eth_signTypedData":
        case "eth_signTypedData_v4": {
          // console.log("[useEvmMessageRiskAnalysis]", {
          //   chainId: evmNetworkId,
          //   source: origin,
          //   method,
          //   message,
          //   json: JSON.parse(message),
          //   userAccount: account,
          // })

          const response = await fetch(urlJoin(RISK_ANALYSIS_API_URL, "msg"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              chainId: evmNetworkId,
              source: origin,
              method,
              message: JSON.parse(message),
              userAccount: account,
            }),
          })

          const { ok, status, statusText } = response
          if (!ok) throw new Error(`Risk analysis failed with status ${status} ${statusText}`)

          const result = await response.json()

          log.log("[useEvmMessageRiskAnalysis]", { result })

          return result
        }
        case "personal_sign": {
          // this is always safe, no need to scan
          return null
        }
        default:
          throw new Error("Unsupported message type. Proceed with caution")
      }
    },
    enabled: enabled && !!method && !!message && !!account && !!evmNetworkId,
  })
}
