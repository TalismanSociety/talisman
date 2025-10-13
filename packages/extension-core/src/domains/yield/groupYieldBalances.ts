import { YieldBalancesDtoWithProduct, YieldPosition } from "./types"

// Helper function to map Yield.xyz network to Talisman network ID
function mapYieldNetworkToNetworkId(yieldNetwork?: string): string | undefined {
  switch (yieldNetwork) {
    case "ethereum":
      return "1"
    case "base":
      return "8453"
    case "arbitrum":
      return "42161"
    case "optimism":
      return "10"
    case "polygon":
      return "137"
    case "gnosis":
      return "100"
    case "avalanche-c":
      return "43114"
    case "binance":
      return "56"
    case "fantom":
      return "250"
    case "celo":
      return "42220"
    case "moonriver":
      return "1285"
    case "harmony":
      return "1666600000"
    case "okc":
      return "66"
    case "core":
      return "1116"
    case "sonic":
      return "146"
    case "katana":
      return "1807"
    case "polkadot":
      return "polkadot"
    case "kusama":
      return "kusama"
    case "westend":
      return "westend"
    case "solana":
      return "solana-mainnet"
    case "near":
      return "near"
    case "cardano":
      return "cardano"
    case "stellar":
      return "stellar"
    case "tezos":
      return "tezos"
    case "tron":
      return "tron"
    case "ton":
      return "ton"
    default:
      return undefined
  }
}

export const createYieldPositions = (items: YieldBalancesDtoWithProduct[]): YieldPosition[] => {
  const positions: YieldPosition[] = []

  // Group items by yieldId to combine multi-validator stakes
  const itemsByYieldId = new Map<string, YieldBalancesDtoWithProduct[]>()

  for (const item of items) {
    if (!itemsByYieldId.has(item.yieldId)) {
      itemsByYieldId.set(item.yieldId, [])
    }
    itemsByYieldId.get(item.yieldId)!.push(item)
  }

  for (const [_yieldId, yieldItems] of itemsByYieldId) {
    // Combine all balances from all items with the same yieldId
    const allBalances = yieldItems
      .flatMap((item) => item.balances)
      .filter((balance) => !balance.token.isPoints)

    // Must have at least one non-claimable balance to show position
    const hasActiveBalance = allBalances.some((b) => b.type !== "claimable")
    if (!hasActiveBalance) continue

    const firstBalance = allBalances[0]
    const firstItem = yieldItems[0]

    // Calculate total USD
    const totalAmountUsd = allBalances.reduce((sum, b) => sum + parseFloat(b.amountUsd || "0"), 0)

    // Get display name - always use product metadata name
    const displayName = firstItem.product?.metadata.name || "Yield Position"

    positions.push({
      ...firstItem,
      balances: allBalances,
      validatorAddress: undefined, // No specific validator for multi-validator positions
      displayName,
      totalAmountUsd,
      networkId:
        mapYieldNetworkToNetworkId(firstBalance.token.network) || firstBalance.token.network,
    })
  }

  return positions
}
