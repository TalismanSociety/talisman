import type { JsonRpcScanParams } from "@blockaid/client/resources/evm/json-rpc.mjs"
import { log } from "@common/log"
import type { EthSignMessageMethod } from "@core/domains/signing/types"
import type { EthNetworkId } from "@talismn/chaindata-provider"
import { useFeatureFlag } from "@ui/state/remoteConfig"

import { blockaid } from "../blockaid"
import { getBlockaidErrorMessage } from "../getBlockaidErrorMessage"
import { useRiskAnalysisBase } from "../useRiskAnalysisBase"

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

  return useRiskAnalysisBase<"ethereum">({
    platform: "ethereum",
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

        log.log("useEvmMessageRiskAnalysis", { scanParams, response })

        return response
      } catch (err) {
        log.error("useEvmMessageRiskAnalysis", { scanParams, err })

        const blockaidErrorMessage = getBlockaidErrorMessage(err)
        if (blockaidErrorMessage) throw new Error(blockaidErrorMessage, { cause: err })

        throw err
      }
    },
    enabled: enabled && !!method && !!params && !!account && !!networkId,
  })
}
