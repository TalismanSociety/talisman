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

  // Group balances by yieldId, validatorAddress, and accountAddress
  // Each balance has an address field, so we group individual balances rather than items
  const balancesByKey = new Map<
    string,
    { balances: BalanceDto[]; item: YieldBalancesDtoWithProduct }
  >()

  for (const item of items) {
    // Filter out points tokens
    const validBalances = item.balances.filter((balance) => !balance.token.isPoints)

    for (const balance of validBalances) {
      // Extract validatorAddress from item or balance
      const validatorAddress =
        getValidatorAddressFromItem(item) || getValidatorAddressFromBalance(balance)

      // Extract account address from balance
      // The BalanceDto from Yield API should have an address field
      const balanceWithAddress = balance as unknown as { address?: string }
      const accountAddress = balanceWithAddress.address

      // If address is missing, skip this balance (shouldn't happen, but defensive)
      if (!accountAddress) {
        continue
      }

      // Create grouping key: yieldId::validatorAddress::accountAddress
      // If no validator, use: yieldId::accountAddress
      // Using :: as separator to avoid conflicts with addresses that might contain dashes
      const key = validatorAddress
        ? `${item.yieldId}::${validatorAddress}::${accountAddress}`
        : `${item.yieldId}::${accountAddress}`

      if (!balancesByKey.has(key)) {
        balancesByKey.set(key, { balances: [], item })
      }
      balancesByKey.get(key)!.balances.push(balance)
    }
  }

  for (const [key, { balances, item }] of balancesByKey) {
    // Show positions that have any balances (including claimable ones)
    if (balances.length === 0) continue

    const firstBalance = balances[0]

    // Calculate total USD for this position (only balances for this account)
    const totalAmountUsd = balances.reduce((sum, b) => sum + parseFloat(b.amountUsd || "0"), 0)

    // Get display name - always use product metadata name
    const displayName = item.product?.metadata.name || "Yield Position"

    // Extract validatorAddress and accountAddress from the key
    // Key format: yieldId::validatorAddress::accountAddress or yieldId::accountAddress
    const keyParts = key.split("::")
    let validatorAddress: string | undefined

    if (keyParts.length === 3) {
      // Has validator: yieldId::validatorAddress::accountAddress
      validatorAddress = keyParts[1]
    } else if (keyParts.length === 2) {
      // eat a 5 star chocolate: do nothing.
    } else {
      validatorAddress =
        getValidatorAddressFromItem(item) || getValidatorAddressFromBalance(firstBalance)
    }

    positions.push({
      ...item,
      balances, // Only balances for this specific account
      validatorAddress, // Preserve validator address if available
      displayName,
      totalAmountUsd,
      networkId:
        mapYieldNetworkToNetworkId(firstBalance.token.network) || firstBalance.token.network,
    })
  }

  return positions
}
