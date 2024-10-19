// import { TokenId } from "@talismn/chaindata-provider"
// import { useAtomValue } from "jotai"
// import { useMemo } from "react"

// import { allBalancesAtom } from "@ui/atoms"

// export const useBalance = (
//   address: string | null | undefined,
//   tokenId: TokenId | null | undefined
// ) => {
//   const allBalances = useAtomValue(allBalancesAtom)

//   return useMemo(
//     () =>
//       allBalances.each.find(
//         (b) => (!address || b.address === address) && (!tokenId || b.tokenId === tokenId)
//       ) ?? null,
//     [address, allBalances.each, tokenId]
//   )
// }
