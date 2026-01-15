import { getNetworks$ } from "@ui/state/chaindata"
import { firstValueFrom } from "rxjs"
import type { ToolHandler, ToolHandlerResult } from "../../types"

interface GetGasEstimateInput {
  chain_id: string
  operation: "transfer" | "swap" | "stake"
}

// Approximate gas units for different operations
const GAS_ESTIMATES: Record<string, Record<string, number>> = {
  transfer: {
    native: 21000, // ETH transfer
    erc20: 65000, // ERC20 transfer
  },
  swap: {
    simple: 150000, // Simple swap
    complex: 350000, // Multi-hop swap
  },
  stake: {
    liquid: 100000, // Liquid staking (Lido, etc.)
    native: 200000, // Native staking
  },
}

export const getGasEstimate: ToolHandler<GetGasEstimateInput> = async (
  input
): Promise<ToolHandlerResult> => {
  try {
    const networks = await firstValueFrom(getNetworks$({ activeOnly: true }))

    const lowerChainId = input.chain_id.toLowerCase()
    const network = networks.find(
      (n) => n.id?.toLowerCase() === lowerChainId || n.name?.toLowerCase().includes(lowerChainId)
    )

    if (!network) {
      const availableChains = networks
        .filter((n) => n.platform === "ethereum")
        .slice(0, 10)
        .map((n) => n.name)
        .join(", ")
      return {
        success: false,
        error: `Chain ${input.chain_id} not found. Available EVM chains: ${availableChains}`,
      }
    }

    // For non-EVM chains, provide a different message
    if (network.platform !== "ethereum") {
      return {
        success: true,
        data: {
          chain: network.name,
          platform: network.platform,
          message: `${network.name} is a ${network.platform} chain. Gas estimation works differently than EVM chains.`,
          estimatedFee:
            network.platform === "polkadot"
              ? "Fees are typically very low (< $0.01)"
              : "Fees vary by network congestion",
        },
      }
    }

    // Get gas estimates based on operation
    let gasUnits: number
    let description: string

    switch (input.operation) {
      case "transfer":
        gasUnits = GAS_ESTIMATES.transfer.erc20
        description = "Token transfer"
        break
      case "swap":
        gasUnits = GAS_ESTIMATES.swap.complex
        description = "Token swap (estimated for multi-step)"
        break
      case "stake":
        gasUnits = GAS_ESTIMATES.stake.liquid
        description = "Staking operation"
        break
      default:
        gasUnits = 100000
        description = "Unknown operation"
    }

    // Note: In production, we would fetch actual gas prices from the chain
    // For now, provide approximate ranges
    const gasInfo = {
      chain: network.name,
      operation: input.operation,
      description,
      estimatedGasUnits: gasUnits,
      note: "Actual gas costs depend on current network congestion. Check your wallet for exact fees before confirming.",
      typicalCostRange: getTypicalCostRange(network.name || "", input.operation),
    }

    return {
      success: true,
      data: gasInfo,
    }
  } catch (_error) {
    return {
      success: false,
      error: "Failed to estimate gas",
    }
  }
}

function getTypicalCostRange(chainName: string, operation: string): string {
  const chainLower = chainName.toLowerCase()

  // Approximate cost ranges by chain
  if (chainLower.includes("ethereum") || chainLower === "mainnet") {
    switch (operation) {
      case "transfer":
        return "$1 - $10"
      case "swap":
        return "$5 - $50"
      case "stake":
        return "$5 - $30"
      default:
        return "$1 - $20"
    }
  }

  if (chainLower.includes("polygon")) {
    return "$0.01 - $0.10"
  }

  if (chainLower.includes("arbitrum") || chainLower.includes("optimism")) {
    return "$0.10 - $1.00"
  }

  if (chainLower.includes("base")) {
    return "$0.01 - $0.50"
  }

  // Default for other L2s
  return "$0.01 - $1.00"
}
