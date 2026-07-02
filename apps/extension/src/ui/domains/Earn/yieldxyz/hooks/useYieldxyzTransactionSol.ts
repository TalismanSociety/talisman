import { log } from "@common/log"
import type { TransactionDto } from "@core/domains/earn/exports"
import {
  getMessageBase64,
  type SolTransaction,
  serializeTransaction,
  transactionFromBytes,
} from "@talismn/solana"
import { useQuery } from "@tanstack/react-query"
import { useSolTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/solana/useSolTransactionRiskAnalysis"
import { useNetworkById } from "@ui/state/chaindata"
import { useSolanaRpc } from "@ui/util/solana/useSolanaRpc"
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
  const rpc = useSolanaRpc(props?.networkId)

  const solTx = useMemo(() => {
    if (!network || !props?.transaction) return null
    return deserializeYieldxyzSolTransaction(props.transaction)
  }, [network, props?.transaction])

  const { data: estimatedFee, ...feeQuery } = useQuery({
    queryKey: [
      "yieldxyz-sol-fee",
      props?.transaction?.id,
      props?.transaction?.unsignedTransaction,
      props?.networkId,
    ],
    queryFn: async () => {
      if (!solTx || !rpc) return null

      const result = await rpc.getFeeForMessage(getMessageBase64(solTx)).send()
      return result.value != null ? String(result.value) : null
    },
    enabled: !!solTx && !!rpc,
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
