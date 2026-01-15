import { portfolioGlobalData$ } from "@ui/state/portfolio"
import { firstValueFrom, timeout } from "rxjs"
import type { ToolHandler, ToolHandlerResult } from "../../types"

interface GetPortfolioSummaryInput {
  include_small_balances?: boolean
}

interface HoldingInfo {
  token: string | undefined
  chain: string | undefined
  balance: string
  fiatValue: number
}

const PORTFOLIO_TIMEOUT_MS = 10000

export const getPortfolioSummary: ToolHandler<GetPortfolioSummaryInput> = async (
  input
): Promise<ToolHandlerResult> => {
  try {
    const { portfolioBalances } = await firstValueFrom(
      portfolioGlobalData$.pipe(
        timeout({
          first: PORTFOLIO_TIMEOUT_MS,
          with: () => {
            throw new Error("Timed out loading portfolio data. Please try again.")
          },
        })
      )
    )

    const threshold = input.include_small_balances ? 0 : 1 // $1 threshold

    const holdings: HoldingInfo[] = portfolioBalances.each
      .map((balance) => {
        const fiatValue = balance.total.fiat("usd") ?? 0
        return {
          token: balance.token?.symbol,
          chain: balance.network?.name,
          balance: balance.total.tokens ?? "0",
          fiatValue,
        }
      })
      .filter((h) => h.fiatValue >= threshold)
      .sort((a, b) => b.fiatValue - a.fiatValue)

    const totalValue = holdings.reduce((sum, h) => sum + h.fiatValue, 0)

    // Group by chain
    const byChain = holdings.reduce(
      (acc, h) => {
        const chain = h.chain || "Unknown"
        acc[chain] = (acc[chain] || 0) + h.fiatValue
        return acc
      },
      {} as Record<string, number>
    )

    // Group by token
    const byToken = holdings.reduce(
      (acc, h) => {
        const token = h.token || "Unknown"
        acc[token] = (acc[token] || 0) + h.fiatValue
        return acc
      },
      {} as Record<string, number>
    )

    return {
      success: true,
      data: {
        totalValue: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        holdingsCount: holdings.length,
        topHoldings: holdings.slice(0, 10).map((h) => ({
          token: h.token,
          chain: h.chain,
          balance: h.balance,
          value: `$${h.fiatValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        })),
        chainDistribution: Object.entries(byChain)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([chain, value]) => ({
            chain,
            value: `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            percentage: totalValue > 0 ? `${((value / totalValue) * 100).toFixed(1)}%` : "0%",
          })),
        tokenDistribution: Object.entries(byToken)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([token, value]) => ({
            token,
            value: `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            percentage: totalValue > 0 ? `${((value / totalValue) * 100).toFixed(1)}%` : "0%",
          })),
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch portfolio data"
    return {
      success: false,
      error: errorMessage,
    }
  }
}
