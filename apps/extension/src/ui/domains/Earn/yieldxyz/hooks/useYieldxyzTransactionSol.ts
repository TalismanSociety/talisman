import { log } from "@common/log"
import type { TransactionDto } from "@core/domains/earn/exports"
import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { isVersionedTransaction, serializeTransaction } from "@talismn/solana"
import { useQuery } from "@tanstack/react-query"
import { useSolTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/solana/useSolTransactionRiskAnalysis"
import { useNetworkById } from "@ui/state/chaindata"
import { useSolanaConnection } from "@ui/util/solana/useSolanaConnection"
import { useMemo } from "react"

import type { UseYieldxyzTransactionProps } from "./types"

const deserializeYieldxyzSolTransaction = (
  tx: TransactionDto
): Transaction | VersionedTransaction | null => {
  try {
    const raw = tx.unsignedTransaction
    if (!raw || typeof raw !== "string") return null

    // yield.xyz sends Solana transactions as base64-encoded serialized transactions
    const bytes = Buffer.from(raw, "base64")

    try {
      return VersionedTransaction.deserialize(bytes)
    } catch {
      return Transaction.from(bytes)
    }
  } catch (error) {
    log.error("Failed to deserialize Yieldxyz SOL transaction", error)
    return null
  }
}

export const useYieldxyzTransactionSol = (props: UseYieldxyzTransactionProps | null) => {
  const network = useNetworkById(props?.networkId, "solana")
  const connection = useSolanaConnection(props?.networkId)

  const solTx = useMemo(() => {
    if (!network || !props?.transaction) return null
    return deserializeYieldxyzSolTransaction(props.transaction)
  }, [network, props?.transaction])

  const { data: estimatedFee, ...feeQuery } = useQuery({
    queryKey: ["yieldxyz-sol-fee", props?.transaction?.id, connection?.rpcEndpoint],
    queryFn: async () => {
      if (!solTx || !connection) return null

      const message = isVersionedTransaction(solTx) ? solTx.message : solTx.compileMessage()

      const result = await connection.getFeeForMessage(message)
      return result.value
    },
    enabled: !!solTx && !!connection,
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
    estimatedFee: estimatedFee ? String(estimatedFee) : null,
    isLoading: feeQuery.isLoading,
    error: feeQuery.error ? (feeQuery.error as Error).message : undefined,
    errorDetails: feeQuery.error ? (feeQuery.error as Error).message : undefined,
    riskAnalysis,
  }
}
