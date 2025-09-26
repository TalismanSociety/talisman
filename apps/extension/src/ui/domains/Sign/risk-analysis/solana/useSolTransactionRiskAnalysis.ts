import { APIError } from "@blockaid/client"
import { MessageScanParams } from "@blockaid/client/resources/solana/message.mjs"
import { SolNetworkId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

import { useFeatureFlag } from "@ui/state"

import { blockaid } from "../blockaid"
import { useRiskAnalysisBase } from "../useRiskAnalysisBase"

type UseSolTransactionRiskAnalysisProps = {
  from: string
  networkId: SolNetworkId | null | undefined
  tx: string | undefined
  origin?: string
  disableAutoRiskScan?: boolean
}

export const useSolTransactionRiskAnalysis = ({
  from,
  networkId,
  tx,
  disableAutoRiskScan,
}: UseSolTransactionRiskAnalysisProps) => {
  const enabled = useFeatureFlag("RISK_ANALYSIS_V2")

  // const txData = useMemo<TransactionScanParams.Data | null>(() => {
  //   if (!tx?.from) return null

  //   return {
  //     data: tx.data,
  //     from: tx.from,
  //     to: tx.to ?? undefined,
  //     value: typeof tx.value === "bigint" ? tx.value.toString() : undefined,
  //   }
  //   // don't pass the whole tx as a memo dependency, as it changes a lot  (ex: gas) it would trigger many api calls
  // }, [tx?.from, tx?.to, tx?.data, tx?.value])

  return useRiskAnalysisBase<"solana">({
    platform: "solana",
    networkId,
    disableAutoRiskScan,
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

        log.debug("useSolTransactionRiskAnalysis", { params, response })

        return response
      } catch (err) {
        log.error("useSolTransactionRiskAnalysis", { params, err })

        if (err instanceof APIError && err.error.detail[0]?.msg)
          throw new Error(err.error.detail[0]?.msg, { cause: err })

        throw err
      }
    },
    enabled: enabled && !!tx && !!networkId,
  })
}
