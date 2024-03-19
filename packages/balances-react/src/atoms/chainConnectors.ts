import { ChainConnectors } from "@talismn/balances"
import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { connectionMetaDb } from "@talismn/connection-meta"
import { atom } from "jotai"

import { chaindataProviderAtom } from "./chaindataProvider"
import { onfinalityApiKeyAtom } from "./config"

export const chainConnectorsAtom = atom<ChainConnectors>((get) => {
  const onfinalityApiKey = get(onfinalityApiKeyAtom)
  const chaindataProvider = get(chaindataProviderAtom)

  const substrate = new ChainConnector(chaindataProvider, connectionMetaDb)
  const evm = new ChainConnectorEvm(chaindataProvider, { onfinalityApiKey })

  return { substrate, evm }
})
