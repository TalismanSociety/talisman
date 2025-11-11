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

    // Separate claimable and non-claimable balances
    const claimableBalances = validBalances.filter((b) => b.type === "claimable")
    const activeBalances = validBalances.filter((b) => b.type !== "claimable")

    // First, process active balances to establish position groups
    for (const balance of activeBalances) {
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

    // Then, add claimable balances to the same groups as their corresponding active balances
    // Try to match claimable balances to existing position groups
    for (const claimableBalance of claimableBalances) {
      // Extract validatorAddress from item or balance
      const validatorAddress =
        getValidatorAddressFromItem(item) || getValidatorAddressFromBalance(claimableBalance)

      // Extract account address from claimable balance
      const claimableBalanceWithAddress = claimableBalance as unknown as { address?: string }
      const claimableAccountAddress = claimableBalanceWithAddress.address

      // If address is missing, skip this balance
      if (!claimableAccountAddress) {
        continue
      }

      // Try to find a matching position group
      // First try with the claimable balance's own address
      let key = validatorAddress
        ? `${item.yieldId}::${validatorAddress}::${claimableAccountAddress}`
        : `${item.yieldId}::${claimableAccountAddress}`

      // If no group found with claimable balance's address, try to find any group with same yieldId and validator
      if (!balancesByKey.has(key)) {
        // Find the first matching group for this yieldId and validator
        const matchingKey = Array.from(balancesByKey.keys()).find((k) => {
          const parts = k.split("::")
          if (validatorAddress) {
            // Has validator: yieldId::validatorAddress::accountAddress
            return parts[0] === item.yieldId && parts[1] === validatorAddress
          } else {
            // No validator: yieldId::accountAddress
            return parts[0] === item.yieldId
          }
        })

        if (matchingKey) {
          key = matchingKey
        } else {
          // No matching group found, create a new one for the claimable balance
          key = validatorAddress
            ? `${item.yieldId}::${validatorAddress}::${claimableAccountAddress}`
            : `${item.yieldId}::${claimableAccountAddress}`
        }
      }

      if (!balancesByKey.has(key)) {
        balancesByKey.set(key, { balances: [], item })
      }
      balancesByKey.get(key)!.balances.push(claimableBalance)
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
