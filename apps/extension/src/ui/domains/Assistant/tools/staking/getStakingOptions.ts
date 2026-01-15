import { portfolioGlobalData$ } from "@ui/state/portfolio"
import { firstValueFrom, timeout } from "rxjs"
import type { ToolHandler, ToolHandlerResult } from "../../types"

interface GetStakingOptionsInput {
  token_symbol: string
}

const PORTFOLIO_TIMEOUT_MS = 10000

// Hardcoded staking information for common tokens
// In production, this would fetch from earn APIs
const STAKING_INFO: Record<
  string,
  {
    available: boolean
    platforms: Array<{
      name: string
      type: string
      apy: string
      minAmount?: string
      lockPeriod?: string
    }>
  }
> = {
  dot: {
    available: true,
    platforms: [
      {
        name: "Polkadot Nomination Pools",
        type: "Nomination Pool",
        apy: "14-18%",
        minAmount: "1 DOT",
        lockPeriod: "28 days unbonding",
      },
      {
        name: "Direct Nomination",
        type: "Validator Staking",
        apy: "14-18%",
        minAmount: "500 DOT",
        lockPeriod: "28 days unbonding",
      },
    ],
  },
  ksm: {
    available: true,
    platforms: [
      {
        name: "Kusama Nomination Pools",
        type: "Nomination Pool",
        apy: "18-22%",
        minAmount: "0.1 KSM",
        lockPeriod: "7 days unbonding",
      },
    ],
  },
  eth: {
    available: true,
    platforms: [
      {
        name: "Lido",
        type: "Liquid Staking",
        apy: "3-4%",
        minAmount: "No minimum",
        lockPeriod: "Liquid (can sell stETH)",
      },
      {
        name: "Rocket Pool",
        type: "Liquid Staking",
        apy: "3-4%",
        minAmount: "0.01 ETH",
        lockPeriod: "Liquid (can sell rETH)",
      },
    ],
  },
  tao: {
    available: true,
    platforms: [
      {
        name: "Bittensor Delegation",
        type: "Validator Delegation",
        apy: "Variable",
        minAmount: "No minimum",
        lockPeriod: "Variable",
      },
    ],
  },
  sol: {
    available: true,
    platforms: [
      {
        name: "Marinade",
        type: "Liquid Staking",
        apy: "6-8%",
        minAmount: "No minimum",
        lockPeriod: "Liquid (can sell mSOL)",
      },
    ],
  },
}

export const getStakingOptions: ToolHandler<GetStakingOptionsInput> = async (
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

    // Check if user has the token
    const userBalance = portfolioBalances.each.find(
      (b) => b.token?.symbol?.toLowerCase() === lowerSymbol
    )

    const stakingInfo = STAKING_INFO[lowerSymbol]

    if (!stakingInfo) {
      return {
        success: true,
        data: {
          token: input.token_symbol.toUpperCase(),
          stakingAvailable: false,
          message: `Staking information for ${input.token_symbol} is not available. This token may not support staking, or staking data is not yet integrated.`,
          userBalance: userBalance
            ? {
                balance: userBalance.total.tokens,
                fiatValue: `$${(userBalance.total.fiat("usd") ?? 0).toFixed(2)}`,
              }
            : null,
        },
      }
    }

    return {
      success: true,
      data: {
        token: input.token_symbol.toUpperCase(),
        stakingAvailable: true,
        platforms: stakingInfo.platforms,
        userBalance: userBalance
          ? {
              balance: userBalance.total.tokens,
              transferable: userBalance.transferable.tokens,
              fiatValue: `$${(userBalance.total.fiat("usd") ?? 0).toFixed(2)}`,
            }
          : {
              balance: "0",
              message: `You don't currently hold any ${input.token_symbol}`,
            },
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch staking options"
    return {
      success: false,
      error: errorMessage,
    }
  }
}
