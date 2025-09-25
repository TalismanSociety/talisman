import { APIError } from "@blockaid/client"
import { TransactionScanParams } from "@blockaid/client/resources/evm/transaction.mjs"
import { MessageScanParams } from "@blockaid/client/resources/solana/message.mjs"
import { EthNetworkId, SolNetworkId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { useMemo } from "react"
import { TransactionRequest } from "viem"

import { useFeatureFlag } from "@ui/state"

import { blockaid } from "../../riskAnalysis/blockaid"
import { useRiskAnalysisBase } from "../../riskAnalysis/useRiskAnalysisBase"

type UseEvmTransactionRiskAnalysisProps = {
  networkId: SolNetworkId | EthNetworkId | undefined
  tx: TransactionRequest | undefined
  origin?: string
  disableAutoRiskScan?: boolean
}

export const useSolanaTransactionRiskAnalysis = ({
  networkId,
  tx,
  disableAutoRiskScan,
}: UseEvmTransactionRiskAnalysisProps) => {
  const enabled = useFeatureFlag("RISK_ANALYSIS_V2")

  const txData = useMemo<TransactionScanParams.Data | null>(() => {
    if (!tx?.from) return null

    return {
      data: tx.data,
      from: tx.from,
      to: tx.to ?? undefined,
      value: typeof tx.value === "bigint" ? tx.value.toString() : undefined,
    }
    // don't pass the whole tx as a memo dependency, as it changes a lot  (ex: gas) it would trigger many api calls
  }, [tx?.from, tx?.to, tx?.data, tx?.value])

  return useRiskAnalysisBase({
    networkId,
    disableAutoRiskScan,
    queryKey: ["useSolanaMessageRiskAnalysis", networkId, txData, origin],
    queryFn: async () => {
      if (networkId !== "solana-mainnet" || !txData) return null

      const params: MessageScanParams = {
        chain: "mainnet",
        encoding: "base58",
        options: ["simulation", "validation"],
        account_address: txData.from,
        metadata: {
          url: origin,
        },
        transactions: [],
      }

      try {
        const response = await blockaid.solana.message.scan(params)

        log.debug("useEvmTransactionRiskAnalysis", { params, response })

        return response
      } catch (err) {
        log.error("useEvmTransactionRiskAnalysis", { params, err })

        if (err instanceof APIError && err.error.detail[0]?.msg)
          throw new Error(err.error.detail[0]?.msg, { cause: err })

        throw err
      }
    },
    enabled: enabled && !!txData && !!networkId,
  })
}
