import { log } from "@common/log"
import type { TransactionDto } from "@core/domains/earn/exports"
import { type SolTransaction, serializeTransaction, transactionFromBytes } from "@talismn/solana"
import { useSolTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/solana/useSolTransactionRiskAnalysis"
import { useGetSolanaFeeEstimate } from "@ui/hooks/useGetSolanaFeeEstimate"
import { useNetworkById } from "@ui/state/chaindata"
import { useMemo } from "react"

import type { UseYieldxyzTransactionProps } from "./types"

const deserializeYieldxyzSolTransaction = (tx: TransactionDto): SolTransaction | null => {
  try {
    const raw = tx.unsignedTransaction
    if (!raw || typeof raw !== "string") return null

    // yield.xyz sends Solana transactions as base64-encoded serialized transactions
    // (the kit decoder handles both legacy and versioned wire formats)
    return transactionFromBytes(Buffer.from(raw, "base64"))
  } catch (error) {
    log.error("Failed to deserialize Yieldxyz SOL transaction", error)
    return null
  }
}

export const useYieldxyzTransactionSol = (props: UseYieldxyzTransactionProps | null) => {
  const network = useNetworkById(props?.networkId, "solana")

  const solTx = useMemo(() => {
    if (!network || !props?.transaction) return null
    return deserializeYieldxyzSolTransaction(props.transaction)
  }, [network, props?.transaction])

  const { data: estimatedFee, ...feeQuery } = useGetSolanaFeeEstimate({
    networkId: props?.networkId,
    transaction: solTx,
  })

  const serializedTx = useMemo(() => (solTx ? serializeTransaction(solTx) : null), [solTx])

  const riskAnalysis = useSolTransactionRiskAnalysis({
    from: props?.address,
    networkId: network?.id,
    tx: serializedTx,
    disableCriticalPane: true,
  })

  if (!network) return null

  return {
    platform: "solana" as const,
    networkId: network.id,
    feeTokenId: network.nativeTokenId,
    transaction: solTx,
    estimatedFee: estimatedFee != null ? String(estimatedFee) : null,
    isLoading: feeQuery.isLoading,
    error: feeQuery.error ? (feeQuery.error as Error).message : undefined,
    errorDetails: feeQuery.error ? (feeQuery.error as Error).message : undefined,
    riskAnalysis,
  }
}
