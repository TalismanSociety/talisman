import type { Chain } from "@core/domains/chains/types"

// talisman onfinality api key
const onfinalityApiKey = "e1b2f3ea-f003-42f5-adf6-d2e6aa3ecfe4"

/**
 * Helper function to add our onfinality RPCs to an array of chains.
 */
const addCustomChainRpcs = (chains: Chain[]): Chain[] =>
  chains.map((chain) => {
    // only add our custom rpcs when the chain is healthy
    // the extension won't bother to connect to unhealthy chains
    if (!chain.isHealthy) return chain

    // copy chain instead of mutating
    const chainWithCustomRpcs = { ...chain }

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

export default addCustomChainRpcs
