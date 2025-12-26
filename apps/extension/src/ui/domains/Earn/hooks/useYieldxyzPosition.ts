// import { useMemo } from "react"

// import { useYieldxyzPositionsEnhanced } from "@ui/state/yieldxyz"

// export const useYieldxyzPosition = (
//   yieldId: string | undefined,
//   accountAddress?: string | null,
//   // validatorAddress?: string | null,
// ) => {
//   const yieldBalancesGrouped = useYieldxyzPositionsEnhanced()

//   const position = useMemo(() => {
//     if (!yieldId || yieldBalancesGrouped.status !== "success" || !yieldBalancesGrouped.data)
//       return null

//     // Find position matching yieldId, account address, and validator address (if provided)
//     return (
//       yieldBalancesGrouped.data.find((pos) => {
//         if (pos.yieldId !== yieldId) return false

//         // If account address is provided, check if any balance matches
//         if (accountAddress) {
//           const hasMatchingAccount = pos.balances.some(
//             (balance) => (balance as unknown as { address?: string }).address === accountAddress,
//           )
//           if (!hasMatchingAccount) return false
//         }

//         // If validator address is provided, check if it matches
//         // if (validatorAddress) {
//         //   if (pos.validatorAddress !== validatorAddress) return false
//         // }

//         return true
//       }) || null
//     )
//   }, [yieldId, accountAddress, yieldBalancesGrouped])

//   return position
// }
