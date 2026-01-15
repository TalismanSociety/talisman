import { getNetworks$ } from "@ui/state/chaindata"
import { transactions$ } from "@ui/state/transactions"
import { firstValueFrom } from "rxjs"
import type { ToolHandler, ToolHandlerResult } from "../../types"

interface GetTransactionHistoryInput {
  limit?: number
  chain_id?: string
}

export const getTransactionHistory: ToolHandler<GetTransactionHistoryInput> = async (
  input
): Promise<ToolHandlerResult> => {
  try {
    const allTransactions = await firstValueFrom(transactions$)
    const networks = await firstValueFrom(getNetworks$({ activeOnly: true }))

    const networkMap = new Map(networks.map((n) => [n.id, n]))

    let filtered = allTransactions

    if (input.chain_id) {
      const lowerChainId = input.chain_id.toLowerCase()
      filtered = filtered.filter((tx) => {
        const network = networkMap.get(tx.networkId)
        return (
          tx.networkId?.toLowerCase() === lowerChainId ||
          network?.name?.toLowerCase() === lowerChainId
        )
      })
    }

    const limit = input.limit || 10
    const transactions = filtered.slice(0, limit).map((tx) => {
      const network = networkMap.get(tx.networkId)
      return {
        hash: tx.id,
        type: tx.txInfo?.type || "unknown",
        status: tx.status,
        timestamp: new Date(tx.timestamp).toISOString(),
        chain: network?.name || tx.networkId,
        from: tx.account,
        networkId: tx.networkId,
        // Add transaction info details
        details: tx.txInfo,
      }
    })

    return {
      success: true,
      data: {
        count: transactions.length,
        totalAvailable: filtered.length,
        transactions,
      },
    }
  } catch (_error) {
    return {
      success: false,
      error: "Failed to fetch transaction history",
    }
  }
}
