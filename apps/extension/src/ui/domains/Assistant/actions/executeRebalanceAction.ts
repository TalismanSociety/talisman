import type { PendingAction } from "../types"
import { executeSwapAction } from "./executeSwapAction"
import type { ApprovalData, ExecutionResult, RebalanceActionParams } from "./types"

export const executeRebalanceAction = async (
  action: PendingAction,
  onApprovalNeeded?: (data: ApprovalData) => Promise<boolean>,
  onTradeProgress?: (completed: number, total: number, currentTrade: string) => void
): Promise<ExecutionResult> => {
  const params = action.params as RebalanceActionParams
  const { trades } = params

  if (!trades || trades.length === 0) {
    return {
      success: false,
      error: "No trades required for rebalancing",
    }
  }

  const completedHashes: string[] = []
  const failedTrades: string[] = []

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i]

    // Notify progress
    if (onTradeProgress) {
      onTradeProgress(i, trades.length, `${trade.fromSymbol} → ${trade.toSymbol}`)
    }

    // Create a temporary action for this trade
    const tradeAction: PendingAction = {
      id: `${action.id}-trade-${i}`,
      type: "swap",
      params: {
        from_token: trade.fromSymbol,
        to_token: trade.toSymbol,
        amount: trade.amount,
        routeData: trade.routeData,
      },
      preview: {
        summary: `Trade ${trade.fromSymbol} for ${trade.toSymbol}`,
        details: {},
      },
      status: "executing",
    }

    try {
      const result = await executeSwapAction(tradeAction, onApprovalNeeded)

      if (result.success && result.hash) {
        completedHashes.push(result.hash)
      } else {
        failedTrades.push(`${trade.fromSymbol} → ${trade.toSymbol}: ${result.error}`)
        // Continue with other trades even if one fails
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      failedTrades.push(`${trade.fromSymbol} → ${trade.toSymbol}: ${errorMsg}`)
    }
  }

  // Notify completion
  if (onTradeProgress) {
    onTradeProgress(trades.length, trades.length, "Complete")
  }

  // Return overall result
  if (completedHashes.length === 0) {
    return {
      success: false,
      error: `All ${trades.length} trades failed. Errors: ${failedTrades.join("; ")}`,
    }
  }

  if (failedTrades.length > 0) {
    return {
      success: true,
      hash: completedHashes.join(", "),
      error: `Completed ${completedHashes.length}/${trades.length} trades. Failed: ${failedTrades.join("; ")}`,
    }
  }

  return {
    success: true,
    hash: completedHashes.join(", "),
  }
}
