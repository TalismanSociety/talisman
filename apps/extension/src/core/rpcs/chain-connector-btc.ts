import { ChainConnectorBtc } from "@talismn/chain-connectors"

import { gandalfFetch } from "../domains/gandalf/fetch"
import { chaindataProvider } from "./chaindata"

// gandalfFetch attaches the gandalf access token so requests to the gated
// blockstream-api proxy authenticate; on localhost the proxy accepts requests
// without auth, so dev builds work regardless.
export const chainConnectorBtc = new ChainConnectorBtc(chaindataProvider, gandalfFetch)
