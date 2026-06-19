import type { MessageScanParams } from "@blockaid/client/resources/solana/message.mjs"
import { log } from "@common/log"
import type { SolNetworkId } from "@talismn/chaindata-provider"
import { useFeatureFlag } from "@ui/state/remoteConfig"

import { blockaid } from "../blockaid"
import { getBlockaidErrorMessage } from "../getBlockaidErrorMessage"
import { useRiskAnalysisBase } from "../useRiskAnalysisBase"

type UseSolTransactionRiskAnalysisProps = {
  from: string | null | undefined
  networkId: SolNetworkId | null | undefined
  tx: string | null | undefined
  origin?: string
  disableAutoRiskScan?: boolean
  disableCriticalPane?: boolean
}

export const useSolTransactionRiskAnalysis = ({
  from,
  networkId,
  tx,
  disableAutoRiskScan,
  disableCriticalPane,
}: UseSolTransactionRiskAnalysisProps) => {
  const enabled = useFeatureFlag("RISK_ANALYSIS_V2")

  return useRiskAnalysisBase<"solana">({
    platform: "solana",
    networkId,
    disableAutoRiskScan,
    disableCriticalPane,
    queryKey: ["useSolTransactionRiskAnalysis", from, networkId, tx, origin],
    queryFn: async () => {
      if (networkId !== "solana-mainnet" || !tx || !from) return null

      const params: MessageScanParams = {
        chain: "mainnet",
        encoding: "base58",
        options: ["simulation", "validation"],
        account_address: from,
        metadata: {
          url: origin,
        },
        transactions: [tx],
      }

      try {
        const response = await blockaid.solana.message.scan(params)

        log.log("useSolTransactionRiskAnalysis", { params, response })

        return response
      } catch (err) {
        log.error("useSolTransactionRiskAnalysis", { params, err })

        const blockaidErrorMessage = getBlockaidErrorMessage(err)
        if (blockaidErrorMessage) throw new Error(blockaidErrorMessage, { cause: err })

        throw err
      }
    },
    enabled: enabled && !!tx && !!networkId,
  })
}
