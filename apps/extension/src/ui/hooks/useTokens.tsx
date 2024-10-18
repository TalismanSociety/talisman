import { bind } from "@react-rxjs/core"
import { combineLatest, map } from "rxjs"

import { ChaindataQueryOptions, getTokens$, getTokensMap$ } from "@ui/state"

export { useAllTokens, useAllTokensMap } from "@ui/state"

// export const useAllTokens = () => useAtomValue(allTokensAtom)
// export const useAllTokensMap = () => useAtomValue(allTokensMapAtom)

// const tokensAtomFamily = atomFamily(
//   (options: TokensQueryOptions) =>
//     atom(async (get) => {
//       const [tokens, tokensMap] = await Promise.all([
//         get(tokensArrayAtomFamily(options)),
//         get(tokensMapAtomFamily(options)),
//       ])
//       return { tokens, tokensMap }
//     }),
//   isEqual
// )

// export const useTokens = (options: TokensQueryOptions) => useAtomValue(tokensAtomFamily(options))

// export default useTokens

// TODO put in state
export const [useTokens] = bind((filter: ChaindataQueryOptions) =>
  combineLatest([getTokens$(filter), getTokensMap$(filter)]).pipe(
    map(([tokens, tokensMap]) => ({ tokens, tokensMap }))
  )
)
