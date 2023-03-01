import { ChaindataProvider as Chaindata } from "@talismn/chaindata-provider"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"
import { useEffect, useState } from "react"

import { provideContext } from "../util/provideContext"

export type ChaindataProviderOptions = {
  onfinalityApiKey?: string
}

function useChaindataProvider(options: ChaindataProviderOptions = {}) {
  const [chaindata, setChaindata] = useState(
    () => new ChaindataProviderExtension({ onfinalityApiKey: options.onfinalityApiKey })
  )

  useEffect(() => {
    setChaindata(new ChaindataProviderExtension({ onfinalityApiKey: options.onfinalityApiKey }))
  }, [options.onfinalityApiKey])

  return chaindata
}

export const [ChaindataProvider, useChaindata] = provideContext(useChaindataProvider)
