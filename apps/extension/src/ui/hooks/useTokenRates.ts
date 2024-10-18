// import { TokenId } from "@talismn/chaindata-provider"
// import { useAtomValue } from "jotai"
// import { useMemo } from "react"

// import { tokenRatesMapAtom } from "@ui/atoms"

// export const useTokenRates = (tokenId?: TokenId | null) => {
//   const ratesMap = useAtomValue(tokenRatesMapAtom)
//   return useMemo(() => (tokenId && ratesMap[tokenId]) || null, [ratesMap, tokenId])
// }
export { useTokenRates } from "@ui/state"
