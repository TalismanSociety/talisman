import { getNetworks$ } from "@ui/state/chaindata"
import { getTransaction$ } from "@ui/state/transactions"
import { firstValueFrom } from "rxjs"
import type { WalletTransaction } from "extension-core"
import type { ToolHandler, ToolHandlerResult } from "../../types"

interface AnalyzeTransactionInput {
  transaction_hash: string
}

export const analyzeTransaction: ToolHandler<AnalyzeTransactionInput> = async (
  input
): Promise<ToolHandlerResult> => {
  try {
    const transaction = await firstValueFrom(getTransaction$(input.transaction_hash))

    if (!transaction) {
      return {
        success: false,
        error: `Transaction ${input.transaction_hash} not found in history. It may be from a different wallet or not yet indexed.`,
      }
    }

    const networks = await firstValueFrom(getNetworks$({ activeOnly: true }))
    const network = networks.find((n) => n.id === transaction.networkId)

    const analysis = {
      hash: transaction.id,
      status: transaction.status,
      timestamp: new Date(transaction.timestamp).toISOString(),
      chain: network?.name || transaction.networkId,
      platform: transaction.platform,
      from: transaction.account,
      type: transaction.txInfo?.type || "unknown",
      details: transaction.txInfo,
      // Provide analysis summary
      summary: generateTransactionSummary(transaction),
    }

    return {
      success: true,
      data: analysis,
    }
  } catch (_error) {
    return {
      success: false,
      error: "Failed to analyze transaction",
    }
  }
}

function generateTransactionSummary(tx: WalletTransaction): string {
  if (!tx.txInfo) {
    return `Transaction on ${tx.platform || "unknown chain"}`
  }

  switch (tx.txInfo.type) {
    case "transfer":
      return `Transfer of ${tx.txInfo.tokenId || "tokens"} to ${tx.txInfo.to || "recipient"}`
    case "swap-lifi":
    case "swap-simpleswap":
    case "swap-stealthex":
      return `Swap from ${tx.txInfo.fromTokenId || "token"} to ${tx.txInfo.toTokenId || "token"}`
    case "approve-erc20":
      return `ERC20 approval for ${tx.txInfo.contractAddress || "contract"}`
    case "bittensor-staking":
      return `Bittensor staking operation`
    default: {
      // TypeScript exhaustiveness check - this should never happen
      const _exhaustive: never = tx.txInfo
      return `Transaction on ${tx.platform || "unknown chain"}`
    }
  }
}
