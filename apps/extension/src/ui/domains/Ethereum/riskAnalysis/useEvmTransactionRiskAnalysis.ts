import { getBlowfishClient, serializeTransactionRequest } from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { TransactionRequest } from "viem"

import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"
import { useEvmRiskAnalysisOrigin } from "./useEvmRiskAnalysisOrigin"

type UseEvmTransactionRiskAnalysisProps = {
  evmNetworkId: EvmNetworkId | undefined
  tx: TransactionRequest | undefined
  url?: string
  disableAutoRiskScan?: boolean
}

export const useEvmTransactionRiskAnalysis = ({
  evmNetworkId,
  tx,
  url,
  disableAutoRiskScan,
}: UseEvmTransactionRiskAnalysisProps) => {
  const origin = useEvmRiskAnalysisOrigin(url)

  return useEvmRiskAnalysisBase({
    type: "transaction",
    evmNetworkId,
    disableAutoRiskScan,
    queryKey: [
      "useEvmTransactionRiskAnalysis",
      evmNetworkId,
      tx && serializeTransactionRequest(tx),
      origin,
    ],
    // TODO remove async
    queryFn: async () => {
      if (!evmNetworkId || !tx) return null
      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

      // TODO remove
      log.debug("querying blowfish", { evmNetworkId, tx, origin })

      // // TODO remove
      // await sleep(2000)

      return client.scanTransactions(
        [
          {
            data: tx.data,
            from: tx.from,
            to: tx.to ?? undefined,
            value: typeof tx.value === "bigint" ? tx.value.toString() : undefined,
          },
        ],
        tx.from,
        { origin }
      )
    },
    enabled: !!tx && !!evmNetworkId,
  })
}
