import { EvmTxData } from "@blowfishxyz/api-client/v20230605"
import { getBlowfishClient } from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { useMemo } from "react"
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

      log.debug("querying blowfish", { evmNetworkId, tx, origin })

      return client.scanTransactions([txData], txData.from, { origin })
    },
    enabled: !!txData && !!evmNetworkId,
  })
}
