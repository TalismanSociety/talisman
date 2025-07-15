import { ChainConnectors } from "@talismn/balances"
import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChainConnectorSol } from "@talismn/chain-connector-sol"
import { connectionMetaDb } from "@talismn/connection-meta"
import { atom } from "jotai"

import { chaindataProviderAtom } from "./chaindataProvider"

export const chainConnectorsAtom = atom<ChainConnectors>((get) => {
  const chaindataProvider = get(chaindataProviderAtom)

  const substrate = new ChainConnector(chaindataProvider, connectionMetaDb)
  const evm = new ChainConnectorEvm(chaindataProvider)
  const solana = new ChainConnectorSol(chaindataProvider)

  return { substrate, evm, solana }
})
