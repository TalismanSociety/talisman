import type { TransactionMessageBytesBase64 } from "@solana/kit"
import type { Transaction, VersionedTransaction } from "@solana/web3.js"
import { isVersionedTransaction } from "@talismn/solana"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getFrontEndSolanaRpc } from "@ui/util/solana/useSolanaRpc"

type UseGetSolanaFeeEstimateParams = {
  networkId: string | null | undefined
  transaction: Transaction | VersionedTransaction | null | undefined
}

/**
 * Estimates the network fee for a Solana transaction using `getFeeForMessage`.
 *
 * Return shape mirrors the substrate `useGetFeeEstimate` hook so the confirm
 * page can treat both platforms uniformly.
 */
export const useGetSolanaFeeEstimate = ({
  networkId,
  transaction,
}: UseGetSolanaFeeEstimateParams) => {
  return useQuery({
    queryKey: [
      "swap-solana-fee-estimate",
      networkId,
      // Serialize key fields so the query re-runs when the tx changes
      transaction
        ? isVersionedTransaction(transaction)
          ? transaction.message.recentBlockhash
          : transaction.recentBlockhash
        : null,
    ],
    queryFn: async () => {
      const rpc = getFrontEndSolanaRpc(networkId)
      if (!rpc || !transaction) return null

      const message = isVersionedTransaction(transaction)
        ? transaction.message.serialize()
        : transaction.compileMessage().serialize()
      const base64Message = Buffer.from(message).toString("base64") as TransactionMessageBytesBase64

      const result = await rpc.getFeeForMessage(base64Message).send()
      // Solana RPC returns `value: null` when the message can't be processed
      // (e.g. expired blockhash). Surface this as an error so React-Query
      // populates `error` instead of `data: null`, otherwise downstream
      // consumers (useFeeBalanceCheck) get stuck in a permanent loading state.
      // Use `== null` to allow a legitimate (theoretical) zero fee.
      if (result.value == null) throw new Error("Failed to estimate Solana transaction fee")

      return BigInt(result.value)
    },
    enabled: !!networkId && !!transaction,
    placeholderData: keepPreviousData,
  })
}
