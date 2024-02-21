import { TokensQueryOptions, tokensArrayAtomFamily, tokensMapAtomFamily } from "@ui/atoms"
import { atom, useAtomValue } from "jotai"
import { atomFamily } from "jotai/utils"

const tokensAtomFamily = atomFamily((options: TokensQueryOptions) =>
  atom(async (get) => {
    const [tokens, tokensMap] = await Promise.all([
      get(tokensArrayAtomFamily(options)),
      get(tokensMapAtomFamily(options)),
    ])
    return { tokens, tokensMap }
  })
)

export const useTokens = (options: TokensQueryOptions) => useAtomValue(tokensAtomFamily(options))

export default useTokens
