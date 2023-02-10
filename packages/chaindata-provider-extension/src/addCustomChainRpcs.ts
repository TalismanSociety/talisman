import { Chain } from "@talismn/chaindata-provider"

/**
 * Helper function to add our onfinality api key to any public onfinality RPC urls in an array of chains.
 */
export const addCustomChainRpcs = (chains: Chain[], onfinalityApiKey?: string): Chain[] =>
  chains.map((chain) => {
    // only add our custom rpcs when the chain is healthy
    // the extension won't bother to connect to unhealthy chains
    if (!chain.isHealthy) return chain

    // copy chain instead of mutating
    const chainWithCustomRpcs = { ...chain }

    if (typeof onfinalityApiKey !== "string" || !onfinalityApiKey) return chainWithCustomRpcs

    // add rpcs
    chainWithCustomRpcs.rpcs = (chainWithCustomRpcs.rpcs || [])
      // convert public onfinality rpc endpoints to private onfinality rpc endpoints
      .map((rpc) => {
        rpc.url = rpc.url.replace(
          /^wss:\/\/([A-z-]+)\.api\.onfinality\.io\/public-ws\/?$/,
          `wss://$1.api.onfinality.io/ws?apikey=${onfinalityApiKey}`
        )
        return rpc
      })
      // prioritise onfinality rpcs
      .sort((a, b) => {
        if (a.url.includes("api.onfinality.io")) return -1
        if (b.url.includes("api.onfinality.io")) return 1
        return 0
      })

    // return copy
    return chainWithCustomRpcs
  })
