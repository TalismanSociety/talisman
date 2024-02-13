import { ChaindataProvider, ChaindataProviderOptions } from "@talismn/chaindata-provider"
import { useEffect, useMemo, useState } from "react"

import { provideContext } from "../util/provideContext"

function useChaindataProvider(options: ChaindataProviderOptions = {}) {
  const [onfinalityApiKey, setOnfinalityApiKey] = useState(options.onfinalityApiKey)

  // make sure we recreate provider only when the onfinalityApiKey changes
  useEffect(() => {
    if (options.onfinalityApiKey !== onfinalityApiKey) setOnfinalityApiKey(options.onfinalityApiKey)
  }, [options.onfinalityApiKey, onfinalityApiKey])

  return useMemo(() => new ChaindataProvider({ onfinalityApiKey }), [onfinalityApiKey])
}

export const [ChaindataReactProvider, useChaindata] = provideContext(useChaindataProvider)
