import { ApiPromise } from "@polkadot/api"
import { chainConnectorsAtom } from "@talismn/balances-react"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomFamily } from "jotai/utils"

/**
 * This atom can be used to get access to an `ApiPromise` for talking to a Polkadot blockchain.
 *
 * The advantage of using this atom over creating your own `ApiPromise`, is that the underlying websocket
 * connections will be shared between all code which uses this atom.
 */
export const apiPromiseAtom = atomFamily((chainId?: string) =>
  atom(async (get) => {
    if (!chainId) return

    const subChainConnector = get(chainConnectorsAtom).substrate
    if (!subChainConnector) return

    const provider = subChainConnector.asProvider(chainId)
    const apiPromise = new ApiPromise({ provider, noInitWarn: true })

    // register effect to clean up ApiPromise when it's no longer in use
    get(cleanupApiPromiseEffect(chainId, apiPromise))

    await apiPromise.isReady
    return apiPromise
  }),
)

const cleanupApiPromiseEffect = (chainId: string | undefined, apiPromise: ApiPromise) =>
  atomEffect(() => {
    return () => {
      apiPromiseAtom.remove(chainId)
      try {
        apiPromise.disconnect()
      } catch (cause) {
        console.warn(`Failed to close ${chainId} apiPromise: ${cause}`) // eslint-disable-line no-console
      }
    }
  })
