import { getTransactionSerializable } from "@extension/core"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { PublicClient, TransactionRequest, serializeTransaction } from "viem"

import { getOpStackEthL1DataFee } from "./opStack"

export const useEthEstimateL1DataFee = (
  publicClient: PublicClient | undefined,
  tx: TransactionRequest | undefined
) => {
  const serialized = useMemo(
    () =>
      tx && publicClient?.chain?.id
        ? serializeTransaction(getTransactionSerializable(tx, publicClient.chain.id))
        : null,
    [publicClient?.chain?.id, tx]
  )

  return useQuery({
    queryKey: ["useEthEstimateL1DataFee", publicClient?.chain?.id, serialized],
    queryFn: () => {
      if (!publicClient?.chain?.id || !serialized) return null

      return getOpStackEthL1DataFee(publicClient, serialized)
    },
    keepPreviousData: true,
    refetchInterval: 6_000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: !!publicClient?.chain?.id && !!serialized,
  })
}
