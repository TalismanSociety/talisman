import { ChainConnectors } from "@talismn/balances"
import { ChainConnectorDot, ChainConnectorEth, ChainConnectorSol } from "@talismn/chain-connectors"
import { connectionMetaDb } from "@talismn/connection-meta"
import { atom } from "jotai"

import { chaindataProviderAtom } from "./chaindataProvider"

export const chainConnectorsAtom = atom<ChainConnectors>((get) => {
  const chaindataProvider = get(chaindataProviderAtom)

  const substrate = new ChainConnectorDot(chaindataProvider, connectionMetaDb)
  const evm = new ChainConnectorEth(chaindataProvider)
  const solana = new ChainConnectorSol(chaindataProvider)

  return { substrate, evm, solana }
})
