// import http from "http"

import { JsonRpcScanParams } from "@blockaid/client/resources/evm/json-rpc.mjs"
import { EthNetworkId } from "@talismn/chaindata-provider"
import { EthSignMessageMethod } from "extension-core"
import { log } from "extension-shared"

import { useFeatureFlag } from "@ui/state"

import { blockaid } from "./blockaid"
import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"

type UseEvmMessageRiskAnalysisProps = {
  networkId: EthNetworkId | undefined
  method: EthSignMessageMethod | undefined
  message: string | undefined
  account: string | undefined
  origin: string
  disableAutoRiskScan?: boolean
}

export const useEvmMessageRiskAnalysis = ({
  networkId,
  method,
  message,
  account,
  origin,
  disableAutoRiskScan,
}: UseEvmMessageRiskAnalysisProps) => {
  const enabled = useFeatureFlag("RISK_ANALYSIS_V2")

  return useEvmRiskAnalysisBase({
    networkId,
    disableAutoRiskScan,
    queryKey: ["useEvmMessageRiskAnalysis", networkId, method, message, account, origin],
    queryFn: async () => {
      if (!networkId || !method || !message || !account) return null

      const params: JsonRpcScanParams = {
        chain: `0x${Number(networkId).toString(16)}`,
        data: {
          method,
          params: [account, message],
        },
        metadata: { domain: origin },
      }

      const response = await blockaid.evm.jsonRpc.scan(params)

      log.debug("useEvmMessageRiskAnalysis", { payload: params, response })

      return response
    },
    enabled: enabled && !!method && !!message && !!account && !!networkId,
  })
}
