import { db } from "@core/db"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import type { EthNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import type { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { useLiveQuery } from "dexie-react-hooks"
import type { Hex, TransactionReceipt } from "viem"

import { getEvmPublicClient } from "../swap-modules/evm-network"

/** the transaction remembers the priority and the fee the user saw when they signed it */
export const withPricing = (
  txInfo: WalletTransactionInfo,
  { priority, txDetails }: Pick<ReturnType<typeof useEthTransaction>, "priority" | "txDetails">
): WalletTransactionInfo =>
  priority && txDetails
    ? { ...txInfo, pricing: { priority, estimatedFee: txDetails.estimatedFee.toString() } }
    : txInfo

/** rollups charge their L1 data fee on top of the gas the transaction burnt */
const paidFee = (receipt: TransactionReceipt & { l1Fee?: bigint | Hex | null }) =>
  receipt.gasUsed * receipt.effectiveGasPrice + BigInt(receipt.l1Fee ?? 0)

/** what a sent transaction costs: its estimate until it is mined, then what it paid */
export const useSentTxFee = (hash: Hex, networkId: EthNetworkId) => {
  const row = useLiveQuery(() => db.transactionsV2.get(hash), [hash])
  const status = row?.status
  const paid = useQuery({
    queryKey: ["swap-sent-tx-fee", networkId, hash, status],
    queryFn: async () =>
      paidFee(await (await getEvmPublicClient(networkId)).getTransactionReceipt({ hash })),
    enabled: status !== "pending",
    staleTime: Infinity,
    retry: false,
  })
  const pricing = row?.txInfo?.pricing

  return {
    priority: pricing?.priority,
    estimatedFee: pricing ? BigInt(pricing.estimatedFee) : undefined,
    paidFee: paid.data,
    isLoading: status === "pending" || paid.isFetching,
  }
}
