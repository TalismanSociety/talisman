import { getMessageBase64, type SolTransaction } from "@talismn/solana"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { getFrontEndSolanaRpc } from "@ui/util/solana/useSolanaRpc"
import { useMemo } from "react"

type UseGetSolanaFeeEstimateParams = {
  networkId: string | null | undefined
  transaction: SolTransaction | null | undefined
  /**
   * Optional refetch interval (ms) to keep the estimate fresh while a confirm screen is open.
   * Pass `false` (the default) to estimate once.
   */
  refetchInterval?: number | false
}

/**
 * Estimates the network fee for a Solana transaction using `getFeeForMessage`.
 *
 * Single source of truth for Solana fee estimation (send, sign, swap, yield.xyz). Returns the
 * fee as a `bigint` in lamports; the return shape mirrors the substrate `useGetFeeEstimate` hook
 * so confirm pages can treat both platforms uniformly.
 */
export const useGetSolanaFeeEstimate = ({
  networkId,
  transaction,
  refetchInterval = false,
}: UseGetSolanaFeeEstimateParams) => {
  // `getMessageBase64` is the exact payload sent to `getFeeForMessage` and uniquely identifies
  // the transaction. Memoize it so it isn't recomputed on every render, and key the query on it
  // so two transactions that happen to share a blockhash don't collide in the cache.
  const messageBase64 = useMemo(
    () => (transaction ? getMessageBase64(transaction) : null),
    [transaction]
  )

  return useQuery({
    queryKey: ["solana-fee-estimate", networkId, messageBase64],
    queryFn: async () => {
      const rpc = getFrontEndSolanaRpc(networkId)
      if (!rpc || !messageBase64) return null

      const result = await rpc.getFeeForMessage(messageBase64).send()
      // Solana RPC returns `value: null` when the message can't be processed
      // (e.g. expired blockhash). Surface this as an error so React-Query
      // populates `error` instead of `data: null`, otherwise downstream
      // consumers (useFeeBalanceCheck) get stuck in a permanent loading state.
      // Use `== null` to allow a legitimate (theoretical) zero fee.
      if (result.value == null) throw new Error("Failed to estimate Solana transaction fee")

      return BigInt(result.value)
    },
    enabled: !!networkId && !!messageBase64,
    placeholderData: keepPreviousData,
    refetchInterval,
  })
}
