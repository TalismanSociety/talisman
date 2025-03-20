import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"
import urlJoin from "url-join"
import { getAddress, TransactionRequest } from "viem"

import { log, RISK_ANALYSIS_API_URL } from "@extension/shared"
import { useFeatureFlag } from "@ui/state"

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
  origin,
}: UseEvmTransactionRiskAnalysisProps) => {
  const enabled = useFeatureFlag("RISK_ANALYSIS")

  const txData = useMemo(() => {
    if (!tx?.from) return null

    return {
      from: getAddress(tx.from),
      to: tx.to ? getAddress(tx.to) : undefined,
      // input : STRING - ABI encoded call
      input: tx.data,
      // value : HEX - hex integer of the value sent by the transaction
      value: typeof tx.value === "bigint" ? `0x${tx.value.toString(16)}` : undefined,
    }
    // don't pass the whole tx as a memo dependency, as it changes a lot  (ex: gas) it would trigger many api calls
  }, [tx?.from, tx?.to, tx?.data, tx?.value])

  return useEvmRiskAnalysisBase({
    type: "transaction",
    evmNetworkId,
    disableAutoRiskScan,
    queryKey: ["useEvmTransactionRiskAnalysis", evmNetworkId, txData, origin],
    queryFn: async () => {
      if (!evmNetworkId || !txData?.from) return null

      try {
        // console.log("[useEvmTransactionRiskAnalysis]", { txData, origin, evmNetworkId })
        const response = await fetch(urlJoin(RISK_ANALYSIS_API_URL, "tx"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            chainId: evmNetworkId,
            source: origin,
            payload: txData,
          }),
        })

        const { ok, status, statusText } = response
        if (!ok) throw new Error(`Risk analysis failed with status ${status} ${statusText}`)

        const result = await response.json()

        log.log("[useEvmTransactionRiskAnalysis]", { result })

        return result
      } catch (err) {
        log.error("[useEvmTransactionRiskAnalysis] Risk analysis failed", { err })
        return null
      }
    },
    enabled: enabled && !!txData && !!evmNetworkId,
  })
}
