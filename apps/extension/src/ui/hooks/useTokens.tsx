import {
  TokensQueryOptions,
  allTokensAtom,
  allTokensMapAtom,
  tokensArrayAtomFamily,
  tokensMapAtomFamily,
} from "@ui/atoms"
import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"
import isEqual from "lodash/isEqual"

export const useAllTokens = () => useAtomValue(allTokensAtom)
export const useAllTokensMap = () => useAtomValue(allTokensMapAtom)

const tokensAtomFamily = atomFamily(
  (options: TokensQueryOptions) =>
    atom(async (get) => {
      const [tokens, tokensMap] = await Promise.all([
        get(tokensArrayAtomFamily(options)),
        get(tokensMapAtomFamily(options)),
      ])
      return { tokens, tokensMap }
    }),
  isEqual
)

export const useTokens = (options: TokensQueryOptions) => useAtomValue(tokensAtomFamily(options))

export default useTokens
