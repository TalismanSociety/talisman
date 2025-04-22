import { type BalanceDetailRow } from "@ui/domains/Portfolio/AssetDetails/useTokenBalances"

export const sortGroupedStakes = (
  obj: Partial<Record<string | number, BalanceDetailRow[]>>,
  firstKey: string,
) => {
  return Object.entries(obj).sort(([keyA], [keyB]) => {
    if (keyA === firstKey) return -1 // Place firstKey at the top
    if (keyB === firstKey) return 1

    const numA = Number(keyA)
    const numB = Number(keyB)

    // Sort numeric keys as numbers
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB
    }

    // Sort remaining keys alphabetically
    return keyA.localeCompare(keyB, undefined, { numeric: true })
  })
}
