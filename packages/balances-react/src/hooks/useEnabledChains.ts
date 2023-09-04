import { provideContext } from "../util"

const useEnabledChainsProvider = ({ enabledChains }: { enabledChains?: string[] }) => {
  return { enabledChains }
}

export const [EnabledChainsProvider, useEnabledChains] = provideContext(useEnabledChainsProvider)
