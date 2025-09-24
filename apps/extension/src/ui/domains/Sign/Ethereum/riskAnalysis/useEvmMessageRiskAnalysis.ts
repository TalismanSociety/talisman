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
  params: unknown[] | undefined
  account: string | undefined
  origin: string
  disableAutoRiskScan?: boolean
}

export const useEvmMessageRiskAnalysis = ({
  networkId,
  method,
  params,
  account,
  origin,
  disableAutoRiskScan,
}: UseEvmMessageRiskAnalysisProps) => {
  const enabled = useFeatureFlag("RISK_ANALYSIS_V2")

  return useEvmRiskAnalysisBase({
    networkId,
    disableAutoRiskScan,
    queryKey: ["useEvmMessageRiskAnalysis", networkId, method, params, account, origin],
    queryFn: async () => {
      if (!networkId || !method || !params || !account) return null

      const scanParams: JsonRpcScanParams = {
        chain: `0x${Number(networkId).toString(16)}`,
        data: {
          method,
          params,
        },
        metadata: { domain: origin },
      }
      try {
        const response = await blockaid.evm.jsonRpc.scan(scanParams)

        log.debug("useEvmMessageRiskAnalysis", { scanParams, response })

        return response
      } catch (err) {
        log.error("useEvmMessageRiskAnalysis", { scanParams })
        throw err
      }
    },
    enabled: enabled && !!method && !!params && !!account && !!networkId,
  })
}
