import { mapYieldNetworkToNetworkId } from "./networkMapping"
import { BalanceDto, YieldBalancesDtoWithProduct, YieldPosition } from "./types"

// Helper function to safely extract validatorAddress from an item
function getValidatorAddressFromItem(item: YieldBalancesDtoWithProduct): string | undefined {
  // Check if item has validatorAddress property
  const itemWithUnknown = item as unknown as Record<string, unknown>
  if ("validatorAddress" in item && typeof itemWithUnknown.validatorAddress === "string") {
    return itemWithUnknown.validatorAddress
  }
  return undefined
}

// Helper function to safely extract validatorAddress from a balance
function getValidatorAddressFromBalance(balance: BalanceDto): string | undefined {
  // Check if balance has validatorAddress property
  const balanceWithUnknown = balance as unknown as Record<string, unknown>
  if ("validatorAddress" in balance && typeof balanceWithUnknown.validatorAddress === "string") {
    return balanceWithUnknown.validatorAddress
  }
  // Check if balance has validator object with address property
  if ("validator" in balance && balance.validator) {
    const validatorWithUnknown = balance.validator as unknown as Record<string, unknown>
    if (
      typeof validatorWithUnknown === "object" &&
      "address" in validatorWithUnknown &&
      typeof validatorWithUnknown.address === "string"
    ) {
      return validatorWithUnknown.address
    }
  }
  return undefined
}

export const createYieldPositions = (items: YieldBalancesDtoWithProduct[]): YieldPosition[] => {
  const positions: YieldPosition[] = []

  // Group items by yieldId and validatorAddress to preserve validator information
  const itemsByYieldAndValidator = new Map<string, YieldBalancesDtoWithProduct[]>()

  for (const item of items) {
    // Create a key that includes both yieldId and validatorAddress (if available)
    // For items without validator info, we'll use yieldId only
    const validatorAddress =
      getValidatorAddressFromItem(item) ||
      (item.balances[0] ? getValidatorAddressFromBalance(item.balances[0]) : undefined)
    const key = validatorAddress ? `${item.yieldId}-${validatorAddress}` : item.yieldId

    if (!itemsByYieldAndValidator.has(key)) {
      itemsByYieldAndValidator.set(key, [])
    }
    itemsByYieldAndValidator.get(key)!.push(item)
  }

  for (const [key, yieldItems] of itemsByYieldAndValidator) {
    // Combine all balances from all items with the same yieldId and validator
    const allBalances = yieldItems
      .flatMap((item) => item.balances)
      .filter((balance) => !balance.token.isPoints)

    // Show positions that have any balances (including claimable ones)
    if (allBalances.length === 0) continue

    const firstBalance = allBalances[0]
    const firstItem = yieldItems[0]

    // Calculate total USD
    const totalAmountUsd = allBalances.reduce((sum, b) => sum + parseFloat(b.amountUsd || "0"), 0)

    // Get display name - always use product metadata name
    const displayName = firstItem.product?.metadata.name || "Yield Position"

    // Extract validatorAddress from the key or from the first balance's validator.address
    const validatorAddress = key.includes("-")
      ? key.split("-")[1]
      : getValidatorAddressFromItem(firstItem) ||
        getValidatorAddressFromBalance(firstBalance) ||
        undefined

    positions.push({
      ...firstItem,
      balances: allBalances,
      validatorAddress, // Preserve validator address if available
      displayName,
      totalAmountUsd,
      networkId:
        mapYieldNetworkToNetworkId(firstBalance.token.network) || firstBalance.token.network,
    })
  }

  return positions
}
