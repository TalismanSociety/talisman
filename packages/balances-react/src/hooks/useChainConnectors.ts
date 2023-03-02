import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { useEffect, useMemo, useState } from "react"

import { provideContext } from "../util/provideContext"
import { useChaindata } from "./useChaindata"

export type ChainConnectorsProviderOptions = {
  onfinalityApiKey?: string
}

function useChainConnectorsProvider(options: ChainConnectorsProviderOptions) {
  // chaindata dependency
  const chaindata = useChaindata()

  // substrate connector
  const [substrate, setSubstrate] = useState<ChainConnector | undefined>()
  useEffect(() => {
    if (!chaindata) return
    setSubstrate(new ChainConnector(chaindata))
  }, [chaindata])

  // evm connector
  const [evm, setEvm] = useState<ChainConnectorEvm | undefined>()
  useEffect(() => {
    if (!chaindata) return
    setEvm(new ChainConnectorEvm(chaindata, { onfinalityApiKey: options.onfinalityApiKey }))
  }, [chaindata, options.onfinalityApiKey])

  return useMemo(() => ({ substrate, evm }), [substrate, evm])
}

export const [ChainConnectorsProvider, useChainConnectors] = provideContext(
  useChainConnectorsProvider
)
