import { Token } from "@talismn/chaindata-provider"
import { useEffect } from "react"

import { useChaindata } from "./useChaindata"

const useExtensionCustomTokens = () => {
  const chaindata = useChaindata()

  const windowInject = globalThis as typeof globalThis & {
    talismanSub?: { subscribeCustomTokens?: (cb: (tokens: Token[]) => unknown) => () => void }
  }

  useEffect(
    () =>
      windowInject.talismanSub?.subscribeCustomTokens?.((tokens) =>
        chaindata.syncCustomTokens(tokens)
      ),
    [chaindata, windowInject.talismanSub]
  )
}

export default useExtensionCustomTokens
