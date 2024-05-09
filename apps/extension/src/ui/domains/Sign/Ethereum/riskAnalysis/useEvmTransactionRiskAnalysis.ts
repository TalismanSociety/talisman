import { EvmTxData } from "@blowfishxyz/api-client/v20230605"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"
import { TransactionRequest } from "viem"

import { getBlowfishClient } from "./blowfish"
import { useEvmRiskAnalysisBase } from "./useEvmRiskAnalysisBase"

type UseEvmTransactionRiskAnalysisProps = {
  evmNetworkId: EvmNetworkId | undefined
  tx: TransactionRequest | undefined
  origin?: string
  disableAutoRiskScan?: boolean
}

export const useEvmTransactionRiskAnalysis = ({
  evmNetworkId,
  tx,
  disableAutoRiskScan,
}: UseEvmTransactionRiskAnalysisProps) => {
  const txData = useMemo<EvmTxData | null>(() => {
    if (!tx?.from) return null

    return {
      data: tx.data,
      from: tx.from,
      to: tx.to ?? undefined,
      value: typeof tx.value === "bigint" ? tx.value.toString() : undefined,
    }
    // don't pass the whole tx as a memo dependency, as it changes a lot  (ex: gas) it would trigger many api calls
  }, [tx?.from, tx?.to, tx?.data, tx?.value])

  return useEvmRiskAnalysisBase({
    type: "transaction",
    evmNetworkId,
    disableAutoRiskScan,
    queryKey: ["useEvmTransactionRiskAnalysis", evmNetworkId, txData, origin],
    queryFn: () => {
      if (!evmNetworkId || !txData?.from) return null

      const client = getBlowfishClient(evmNetworkId)
      if (!client) return null

      return client.scanTransactions([txData], txData.from, { origin })
    },
    enabled: !!txData && !!evmNetworkId,
  })
}
