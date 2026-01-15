import { portfolioGlobalData$ } from "@ui/state/portfolio"
import { firstValueFrom, timeout } from "rxjs"
import type { ToolHandler, ToolHandlerResult } from "../../types"

interface GetTokenBalanceInput {
  token_symbol: string
  chain_id?: string
}

const PORTFOLIO_TIMEOUT_MS = 10000

export const getTokenBalance: ToolHandler<GetTokenBalanceInput> = async (
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

    const lowerSymbol = input.token_symbol.toLowerCase()
    const matchingBalances = portfolioBalances.each.filter((balance) => {
      const symbolMatch = balance.token?.symbol?.toLowerCase() === lowerSymbol
      if (!symbolMatch) return false

      if (input.chain_id) {
        const chainMatch =
          balance.network?.id?.toLowerCase() === input.chain_id.toLowerCase() ||
          balance.network?.name?.toLowerCase() === input.chain_id.toLowerCase()
        return chainMatch
      }

      return true
    })

    if (matchingBalances.length === 0) {
      // Get available tokens for suggestions
      const availableTokens = [
        ...new Set(portfolioBalances.each.map((b) => b.token?.symbol).filter(Boolean)),
      ]
        .slice(0, 10)
        .join(", ")

      return {
        success: false,
        error: `No ${input.token_symbol} found in your portfolio. Available tokens: ${availableTokens}`,
      }
    }

    const balanceDetails = matchingBalances.map((balance) => ({
      token: balance.token?.symbol,
      chain: balance.network?.name,
      balance: balance.total.tokens ?? "0",
      fiatValue: `$${(balance.total.fiat("usd") ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      transferable: balance.transferable.tokens ?? "0",
      locked: balance.locked.tokens ?? "0",
      reserved: balance.reserved.tokens ?? "0",
    }))

    const totalFiatValue = matchingBalances.reduce((sum, b) => sum + (b.total.fiat("usd") ?? 0), 0)

    const totalTokens = matchingBalances.reduce((sum, b) => {
      const tokens = parseFloat(b.total.tokens ?? "0")
      return sum + (Number.isNaN(tokens) ? 0 : tokens)
    }, 0)

    return {
      success: true,
      data: {
        token: input.token_symbol.toUpperCase(),
        totalBalance: totalTokens.toString(),
        totalFiatValue: `$${totalFiatValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        balancesByChain: balanceDetails,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch token balance"
    return {
      success: false,
      error: errorMessage,
    }
  }
}
