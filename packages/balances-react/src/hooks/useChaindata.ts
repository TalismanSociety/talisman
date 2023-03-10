import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"
import { useEffect, useMemo, useState } from "react"

import { provideContext } from "../util/provideContext"

export type ChaindataProviderOptions = {
  onfinalityApiKey?: string
}

function useChaindataProvider(options: ChaindataProviderOptions = {}) {
  const [onfinalityApiKey, setOnfinalityApiKey] = useState(options.onfinalityApiKey)

  // make sure we recreate provider only when the onfinalityApiKey changes
  useEffect(() => {
    if (options.onfinalityApiKey !== onfinalityApiKey) setOnfinalityApiKey(options.onfinalityApiKey)
  }, [options.onfinalityApiKey, onfinalityApiKey])

  return useMemo(() => new ChaindataProviderExtension({ onfinalityApiKey }), [onfinalityApiKey])
}

export const [ChaindataProvider, useChaindata] = provideContext(useChaindataProvider)
