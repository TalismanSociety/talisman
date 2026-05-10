import type { Connection, Transaction, VersionedTransaction } from "@solana/web3.js"
import { isVersionedTransaction } from "@talismn/solana"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

type UseGetSolanaFeeEstimateParams = {
  connection: Connection | null | undefined
  transaction: Transaction | VersionedTransaction | null | undefined
}

/**
 * Estimates the network fee for a Solana transaction using `getFeeForMessage`.
 *
 * Return shape mirrors the substrate `useGetFeeEstimate` hook so the confirm
 * page can treat both platforms uniformly.
 */
export const useGetSolanaFeeEstimate = ({
  connection,
  transaction,
}: UseGetSolanaFeeEstimateParams) => {
  return useQuery({
    queryKey: [
      "swap-solana-fee-estimate",
      connection?.rpcEndpoint,
      // Serialize key fields so the query re-runs when the tx changes
      transaction
        ? isVersionedTransaction(transaction)
          ? transaction.message.recentBlockhash
          : transaction.recentBlockhash
        : null,
    ],
    queryFn: async () => {
      if (!connection || !transaction) return null

      const message = isVersionedTransaction(transaction)
        ? transaction.message
        : transaction.compileMessage()

      const result = await connection.getFeeForMessage(message)
      // Solana RPC returns `value: null` when the message can't be processed
      // (e.g. expired blockhash). Surface this as an error so React-Query
      // populates `error` instead of `data: null`, otherwise downstream
      // consumers (useFeeBalanceCheck) get stuck in a permanent loading state.
      // Use `== null` to allow a legitimate (theoretical) zero fee.
      if (result.value == null) throw new Error("Failed to estimate Solana transaction fee")

      return BigInt(result.value)
    },
    enabled: !!connection && !!transaction,
    placeholderData: keepPreviousData,
  })
}
