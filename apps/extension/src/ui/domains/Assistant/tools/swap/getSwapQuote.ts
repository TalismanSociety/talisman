import * as lifiSdk from "@lifi/sdk"
import { getNetworks$ } from "@ui/state/chaindata"
import { portfolioGlobalData$ } from "@ui/state/portfolio"
import { firstValueFrom, timeout } from "rxjs"
import { zeroAddress } from "viem"
import type { ToolHandler, ToolHandlerResult } from "../../types"

interface GetSwapQuoteInput {
  from_token: string
  to_token: string
  amount: string
  from_chain?: string
  to_chain?: string
}

// Initialize LI.FI SDK
const apiUrl = "https://lifi.talisman.xyz/v1"
lifiSdk.createConfig({ integrator: "talisman", apiUrl })

// Timeout utility for SDK calls
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs)),
  ])
}

// Timeout for observable firstValueFrom calls
const PORTFOLIO_TIMEOUT_MS = 10000
const NETWORKS_TIMEOUT_MS = 5000

export const getSwapQuote: ToolHandler<GetSwapQuoteInput> = async (
  input
): Promise<ToolHandlerResult> => {
  try {
    // Get user's balances to find the token they want to swap from
    // Use timeout to prevent hanging on slow Substrate chains like Bittensor
    const portfolioData = await firstValueFrom(
      portfolioGlobalData$.pipe(
        timeout({
          first: PORTFOLIO_TIMEOUT_MS,
          with: () => {
            throw new Error(
              `Timed out loading portfolio data. This can happen when some chains are slow to respond. Please try again.`
            )
          },
        })
      )
    )
    const { portfolioBalances } = portfolioData

    const networks = await firstValueFrom(
      getNetworks$({ activeOnly: true, platform: "ethereum" }).pipe(
        timeout({
          first: NETWORKS_TIMEOUT_MS,
          with: () => {
            throw new Error(`Timed out loading network data. Please try again.`)
          },
        })
      )
    )

    // Find the from token in user's balances
    const lowerFromToken = input.from_token.toLowerCase()
    const lowerToToken = input.to_token.toLowerCase()

    // First check if user has this token at all (on any chain)
    const allMatchingBalances = portfolioBalances.each.filter(
      (b) => b.token?.symbol?.toLowerCase() === lowerFromToken
    )

    // Then filter to EVM chains only
    const fromBalance = allMatchingBalances.find((b) => {
      if (input.from_chain) {
        const chainMatch =
          b.network?.name?.toLowerCase().includes(input.from_chain.toLowerCase()) ||
          b.network?.id?.includes(input.from_chain)
        return chainMatch && b.network?.platform === "ethereum"
      }
      return b.network?.platform === "ethereum"
    })

    if (!fromBalance) {
      // Check if token exists but only on non-EVM chains
      const nonEvmBalance = allMatchingBalances.find((b) => b.network?.platform !== "ethereum")
      if (nonEvmBalance) {
        const chainName = nonEvmBalance.network?.name || nonEvmBalance.networkId
        const platform = nonEvmBalance.network?.platform || "non-EVM"
        const platformName =
          platform === "polkadot" ? "Substrate" : platform === "solana" ? "Solana" : "non-EVM"

        // Provide specific guidance based on the chain
        const isBittensor =
          chainName?.toLowerCase().includes("bittensor") ||
          nonEvmBalance.networkId?.toLowerCase().includes("bittensor")

        const additionalHelp = isBittensor
          ? " For Bittensor (TAO), you can use the Tao Dashboard swap feature to swap your TAO tokens."
          : ""

        return {
          success: false,
          error: `Your ${input.from_token.toUpperCase()} is on ${chainName} (${platformName} chain). Swaps via the assistant are currently only supported for EVM chains (Ethereum, Polygon, Arbitrum, etc.).${additionalHelp} Please use the main wallet swap interface or bridge your tokens to an EVM chain first.`,
        }
      }

      const availableTokens = portfolioBalances.each
        .filter((b) => b.network?.platform === "ethereum")
        .map((b) => b.token?.symbol)
        .filter(Boolean)
      const uniqueTokens = [...new Set(availableTokens)].slice(0, 10).join(", ")

      return {
        success: false,
        error: `Token ${input.from_token} not found in your EVM wallets. Available EVM tokens: ${uniqueTokens}`,
      }
    }

    // Get the EVM chain ID - the network id IS the chain ID for EVM networks
    const fromNetwork = networks.find((n) => n.id === fromBalance.networkId)
    if (!fromNetwork || fromNetwork.platform !== "ethereum") {
      return {
        success: false,
        error: `${input.from_token} is not on an EVM chain. Swaps are currently only supported for EVM chains.`,
      }
    }

    // Parse the network ID as the chain ID (for EVM networks, the ID is the chain ID as string)
    const fromChainId = parseInt(fromNetwork.id, 10)
    if (Number.isNaN(fromChainId)) {
      return {
        success: false,
        error: `Invalid chain ID for ${fromNetwork.name}`,
      }
    }

    // Parse amount and convert to planck
    const decimals = fromBalance.token?.decimals || 18
    const amountFloat = parseFloat(input.amount)
    if (Number.isNaN(amountFloat) || amountFloat <= 0) {
      return {
        success: false,
        error: "Invalid amount specified",
      }
    }

    const amountPlanck = BigInt(Math.floor(amountFloat * 10 ** decimals))

    // Check if user has enough balance
    const availableBalance = parseFloat(fromBalance.transferable.tokens || "0")
    if (amountFloat > availableBalance) {
      return {
        success: false,
        error: `Insufficient balance. You have ${availableBalance} ${input.from_token} available but tried to swap ${input.amount}`,
      }
    }

    // Get LI.FI tokens to find the to_token (with timeout)
    const lifiTokens = await withTimeout(
      lifiSdk.getTokens({ chainTypes: [lifiSdk.ChainType.EVM] }),
      15000,
      "Timed out fetching available tokens. Please try again."
    )

    // Find the destination chain and token
    let toChainId = fromChainId // Default to same chain
    if (input.to_chain) {
      const toNetwork = networks.find(
        (n) =>
          n.name?.toLowerCase().includes(input.to_chain!.toLowerCase()) ||
          n.id?.includes(input.to_chain!)
      )
      if (toNetwork) {
        const parsedId = parseInt(toNetwork.id, 10)
        if (!Number.isNaN(parsedId)) {
          toChainId = parsedId
        }
      }
    }

    // Find the to token in LI.FI's token list
    const chainTokens = lifiTokens.tokens[toChainId] || []
    const toToken = chainTokens.find((t) => t.symbol.toLowerCase() === lowerToToken)

    if (!toToken) {
      const availableToTokens = chainTokens
        .slice(0, 20)
        .map((t) => t.symbol)
        .join(", ")
      return {
        success: false,
        error: `Token ${input.to_token} not found on the destination chain. Available tokens: ${availableToTokens}`,
      }
    }

    // Get the from token address - use zeroAddress for native tokens
    const fromToken = fromBalance.token
    const fromTokenAddress =
      fromToken?.type === "evm-erc20" && "contractAddress" in fromToken
        ? fromToken.contractAddress
        : zeroAddress

    // Get routes from LI.FI (with timeout)
    const routes = await withTimeout(
      lifiSdk.getRoutes({
        fromAddress: fromBalance.address,
        toAddress: fromBalance.address,
        fromChainId,
        toChainId,
        fromAmount: amountPlanck.toString(),
        fromTokenAddress,
        toTokenAddress: toToken.address,
        options: { integrator: "talisman", fee: 0.002 },
      }),
      30000,
      "Timed out getting swap routes. Please try again."
    )

    if (!routes.routes || routes.routes.length === 0) {
      return {
        success: false,
        error: "No swap routes available for this token pair",
      }
    }

    // Format the routes for display
    const formattedRoutes = routes.routes.slice(0, 3).map((route) => {
      const toAmount = BigInt(route.toAmount)
      const toDecimals = toToken.decimals
      const toAmountFormatted = (Number(toAmount) / 10 ** toDecimals).toFixed(6)

      return {
        id: route.id,
        provider: route.steps.map((s) => s.toolDetails?.name || s.tool).join(" -> "),
        outputAmount: toAmountFormatted,
        estimatedTime: `${Math.round(route.steps.reduce((sum, s) => sum + (s.estimate?.executionDuration || 0), 0) / 60)} min`,
        gasCost: route.gasCostUSD ? `$${parseFloat(route.gasCostUSD).toFixed(2)}` : "Unknown",
        steps: route.steps.length,
      }
    })

    const toNetworkName = networks.find((n) => parseInt(n.id, 10) === toChainId)?.name || "Unknown"

    // Include route data for execution
    const bestRouteRaw = routes.routes[0]

    return {
      success: true,
      data: {
        fromToken: input.from_token.toUpperCase(),
        toToken: input.to_token.toUpperCase(),
        inputAmount: input.amount,
        fromChain: fromNetwork.name,
        toChain: toNetworkName,
        routes: formattedRoutes,
        bestRoute: formattedRoutes[0],
        // Include raw route data for execution
        routeData: {
          route: bestRouteRaw,
          fromChainId,
          toChainId,
          fromTokenAddress,
          toTokenAddress: toToken.address,
          fromAddress: fromBalance.address,
        },
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return {
      success: false,
      error: errorMessage.includes("Timed out")
        ? errorMessage
        : `Failed to get swap quote: ${errorMessage}`,
    }
  }
}
