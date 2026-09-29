import { ChainConnectorBtc } from "@talismn/chain-connectors"

import { gandalfFetch } from "../domains/gandalf/fetch"
import { chaindataProvider } from "./chaindata"

// gandalfFetch attaches the gandalf access token so requests to the gated
// blockstream-api proxy authenticate; on localhost the proxy accepts requests
// without auth, so dev builds work regardless. The token is only for our proxy:
// other endpoints (mempool.space signet, user-configured RPCs) must not receive it.
const isGandalfGatedUrl = (url: string) => {
  try {
    const { hostname } = new URL(url)
    return (
      hostname === "talisman.xyz" ||
      hostname.endsWith(".talisman.xyz") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    )
  } catch {
    return false
  }
}

const btcFetch: typeof fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  return isGandalfGatedUrl(url) ? gandalfFetch(input, init) : fetch(input, init)
}

export const chainConnectorBtc = new ChainConnectorBtc(chaindataProvider, btcFetch)
