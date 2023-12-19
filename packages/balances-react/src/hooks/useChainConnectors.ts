import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { connectionMetaDb } from "@talismn/connection-meta"
import { useEffect, useMemo, useState } from "react"

import { provideContext } from "../util/provideContext"
import { useChaindata } from "./useChaindata"

export type ChainConnectorsProviderOptions = {
  onfinalityApiKey?: string
}

function useChainConnectorsProvider(options: ChainConnectorsProviderOptions) {
  const [onfinalityApiKey, setOnfinalityApiKey] = useState(options.onfinalityApiKey)

  // make sure we recreate provider only when the onfinalityApiKey changes
  useEffect(() => {
    if (options.onfinalityApiKey !== onfinalityApiKey) setOnfinalityApiKey(options.onfinalityApiKey)
  }, [options.onfinalityApiKey, onfinalityApiKey])

  // chaindata dependency
  const chaindata = useChaindata()

  // substrate connector
  const substrate = useMemo(() => new ChainConnector(chaindata, connectionMetaDb), [chaindata])

  // evm connector
  const evm = useMemo(
    () => new ChainConnectorEvm(chaindata, chaindata, { onfinalityApiKey }),
    [chaindata, onfinalityApiKey]
  )

  return useMemo(() => ({ substrate, evm }), [substrate, evm])
}

export const [ChainConnectorsProvider, useChainConnectors] = provideContext(
  useChainConnectorsProvider
)
