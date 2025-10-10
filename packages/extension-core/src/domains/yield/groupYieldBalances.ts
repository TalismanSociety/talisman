import { YieldBalancesDtoWithProduct, YieldPositionGroup } from "./types"

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
      return "solana"
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

export const groupYieldBalances = (
  positions: YieldBalancesDtoWithProduct[],
): YieldPositionGroup[] => {
  const groups = new Map<string, YieldPositionGroup>()

  for (const position of positions) {
    for (const balance of position.balances) {
      // Group by yieldId, address, token symbol, network, and validator for same yield positions
      const validatorAddress =
        (balance as unknown as { validator?: { address?: string } }).validator?.address ||
        "no-validator"
      const key = `${position.yieldId}-${balance.address}-${balance.token.symbol}-${balance.token.network}-${validatorAddress}`

      if (!groups.has(key)) {
        groups.set(key, {
          yieldId: position.yieldId, // Use the first yieldId found
          address: balance.address,
          product: position.product,
          activeBalances: [],
          claimableBalances: [],
          otherBalances: [],
          totalAmountUsd: 0,
          totalActiveAmountUsd: 0,
          totalClaimableAmountUsd: 0,
          totalOtherAmountUsd: 0,
          primaryToken: balance.token,
          validators: [],
          allPendingActions: [],
          isEarning: false,
          hasClaimableRewards: false,
          hasOtherBalances: false,
          rewardPercentage: 0,
          displayName: "",
          networkId: mapYieldNetworkToNetworkId(balance.token.network) || balance.token.network,
        })
      }

      const group = groups.get(key)!

      // Categorize balance by lifecycle type
      if (balance.type === "active" && balance.isEarning === true) {
        // Active and earning -> supplied
        group.activeBalances.push(balance)
        group.totalActiveAmountUsd += parseFloat(balance.amountUsd || "0")
        group.isEarning = group.isEarning || balance.isEarning
      } else if (balance.type === "claimable") {
        // Claimable -> rewards
        group.claimableBalances.push(balance)
        group.totalClaimableAmountUsd += parseFloat(balance.amountUsd || "0")
        group.hasClaimableRewards = true
      } else if (["entering", "exiting", "withdrawable", "locked"].includes(balance.type)) {
        // Other types -> supplied
        group.activeBalances.push(balance)
        group.totalActiveAmountUsd += parseFloat(balance.amountUsd || "0")
        group.isEarning = group.isEarning || balance.isEarning
      }

      // Update total
      group.totalAmountUsd += parseFloat(balance.amountUsd || "0")

      // Collect pending actions
      group.allPendingActions.push(...balance.pendingActions)

      // Extract validator info (support multiple validators)
      if (balance.type === "active" || balance.type === "entering") {
        // Handle single validator
        if (
          (
            balance as unknown as {
              validator?: { name?: string; logoURI?: string; address?: string }
            }
          ).validator
        ) {
          const validator = (
            balance as unknown as {
              validator: { name?: string; logoURI?: string; address?: string }
            }
          ).validator
          group.validators!.push({
            name: validator.name,
            logoURI: validator.logoURI,
            address: validator.address,
          })
        }
        // Handle multiple validators
        if (
          (
            balance as unknown as {
              validators?: Array<{ name?: string; logoURI?: string; address?: string }>
            }
          ).validators
        ) {
          const validators = (
            balance as unknown as {
              validators: Array<{ name?: string; logoURI?: string; address?: string }>
            }
          ).validators
          group.validators!.push(...validators)
        }
      }
    }
  }

  // Calculate UI-ready fields and filter to only yield positions (show actual tokens, not reward/points tokens)
  return Array.from(groups.values())
    .filter((group) => {
      // Show positions where the token is NOT a points/reward token
      const isPointsToken = group.primaryToken.isPoints === true
      return !isPointsToken && group.activeBalances.length > 0
    })
    .map((group) => ({
      ...group,
      rewardPercentage:
        group.totalClaimableAmountUsd > 0 && group.totalActiveAmountUsd > 0
          ? (group.totalClaimableAmountUsd / group.totalActiveAmountUsd) * 100
          : 0,
      displayName: group.validators?.[0]?.name || group.product?.metadata.name || "Yield Position",
      networkId: group.primaryToken.network,
    }))
}
