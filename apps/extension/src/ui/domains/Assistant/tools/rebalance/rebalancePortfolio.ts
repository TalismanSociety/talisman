import type { Balances } from "@talismn/balances"
import { portfolioGlobalData$ } from "@ui/state/portfolio"
import { firstValueFrom, timeout } from "rxjs"
import type { RebalanceActionParams } from "../../actions/types"
import { setPendingAction } from "../../state/pendingActions"
import type { ToolHandler, ToolHandlerResult } from "../../types"

const PORTFOLIO_TIMEOUT_MS = 10000

interface TargetAllocation {
  token: string
  percentage: number
}

interface RebalancePortfolioInput {
  target_allocations: TargetAllocation[]
  tolerance?: number
}

export const rebalancePortfolio: ToolHandler<RebalancePortfolioInput> = async (
  input
): Promise<ToolHandlerResult> => {
  // Validate target allocations sum to 100%
  const totalPercentage = input.target_allocations.reduce((sum, a) => sum + a.percentage, 0)

  if (Math.abs(totalPercentage - 100) > 0.1) {
    return {
      success: false,
      error: `Target allocations must sum to 100%. Current sum: ${totalPercentage}%`,
    }
  }

  // Get current portfolio with timeout to prevent hanging
  let portfolioBalances: Balances
  try {
    const portfolioData: Balances = await firstValueFrom(
      portfolioGlobalData$.pipe(
        timeout({
          first: PORTFOLIO_TIMEOUT_MS,
          with: () => {
            throw new Error("Timed out loading portfolio data. Please try again.")
          },
        })
      )
    )
    portfolioBalances = portfolioData.portfolioBalances
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load portfolio data",
    }
  }

  // Calculate current allocations
  const totalValue = portfolioBalances.each.reduce((sum, b) => sum + (b.total.fiat("usd") ?? 0), 0)

  if (totalValue < 10) {
    return {
      success: false,
      error: "Portfolio value too low for rebalancing",
    }
  }

  // Group balances by token symbol
  const tokenValues: Record<string, number> = {}
  portfolioBalances.each.forEach((b) => {
    const symbol = b.token?.symbol?.toUpperCase() || "UNKNOWN"
    tokenValues[symbol] = (tokenValues[symbol] || 0) + (b.total.fiat("usd") ?? 0)
  })

  // Calculate current allocations
  const currentAllocations = Object.entries(tokenValues).map(([token, value]) => ({
    token,
    value: `$${value.toFixed(2)}`,
    percentage: ((value / totalValue) * 100).toFixed(1),
  }))

  // Calculate required trades
  const tolerance = input.tolerance || 5
  const trades: Array<{
    action: "buy" | "sell"
    token: string
    amount: string
    reason: string
  }> = []

  for (const target of input.target_allocations) {
    const currentValue = tokenValues[target.token.toUpperCase()] || 0
    const currentPercentage = (currentValue / totalValue) * 100
    const targetValue = (target.percentage / 100) * totalValue
    const difference = target.percentage - currentPercentage

    if (Math.abs(difference) > tolerance) {
      if (difference > 0) {
        trades.push({
          action: "buy",
          token: target.token.toUpperCase(),
          amount: `$${(targetValue - currentValue).toFixed(2)}`,
          reason: `Increase from ${currentPercentage.toFixed(1)}% to ${target.percentage}%`,
        })
      } else {
        trades.push({
          action: "sell",
          token: target.token.toUpperCase(),
          amount: `$${(currentValue - targetValue).toFixed(2)}`,
          reason: `Decrease from ${currentPercentage.toFixed(1)}% to ${target.percentage}%`,
        })
      }
    }
  }

  if (trades.length === 0) {
    return {
      success: true,
      data: {
        message:
          "Your portfolio is already within the target allocation tolerance. No rebalancing needed.",
        currentAllocations,
        targetAllocations: input.target_allocations,
        tolerance: `${tolerance}%`,
      },
    }
  }

  // Note: Full rebalancing execution requires getting swap routes for each trade
  // For now, we return the analysis and recommend using individual swaps
  // This is because rebalancing involves complex multi-step trades that need:
  // 1. Determining sell order (which tokens to sell first)
  // 2. Getting swap routes for each trade
  // 3. Executing swaps in the correct order

  // Create pending action for user confirmation
  const actionId = crypto.randomUUID()

  // Build action params - trades will be empty since we can't get routes at this point
  // The execution will need to generate routes dynamically
  const actionParams: RebalanceActionParams = {
    target_allocations: input.target_allocations,
    tolerance,
    trades: [], // Routes need to be fetched at execution time
  }

  setPendingAction({
    id: actionId,
    type: "rebalance",
    params: actionParams,
    preview: {
      summary: `Rebalance portfolio with ${trades.length} trades`,
      details: {
        totalPortfolioValue: `$${totalValue.toFixed(2)}`,
        currentAllocations,
        targetAllocations: input.target_allocations,
        requiredTrades: trades,
        tolerance: `${tolerance}%`,
      },
      warnings: [
        "Rebalancing will execute multiple swaps which may incur significant gas fees",
        "Actual execution prices may differ from estimates",
        "Note: Automated rebalancing is currently limited. For best results, execute individual swaps.",
      ],
    },
    status: "pending_confirmation",
  })

  return {
    success: true,
    requiresConfirmation: true,
    actionId,
    message: `I've calculated a rebalancing plan with ${trades.length} trades to achieve your target allocations. Total portfolio value: $${totalValue.toFixed(2)}. Please review the trades and confirm.`,
  }
}
