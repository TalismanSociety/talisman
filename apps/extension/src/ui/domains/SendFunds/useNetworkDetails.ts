import { Chain, CustomChain, CustomEvmNetwork, EvmNetwork } from "@talismn/chaindata-provider"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSendFunds } from "./useSendFunds"

export const useFormatNetworkName = () => {
  const [t] = useTranslation()

  return useCallback(
    (chain?: Chain | CustomChain, evmNetwork?: EvmNetwork | CustomEvmNetwork) =>
      chain?.name
        ? `${chain.name}${chain.evmNetworks?.length > 0 ? ` (${t("Substrate")})` : ""}`
        : evmNetwork
        ? `${evmNetwork?.name}${evmNetwork?.substrateChain ? ` (${t("Ethereum")})` : ""}`
        : `${t("Chain")} ${(chain ?? evmNetwork)?.id}`,
    [t]
  )
}

export const useNetworkDetails = () => {
  const { chain, evmNetwork } = useSendFunds()
  const formatNetworkName = useFormatNetworkName()
  const { networkId, networkName } = useMemo(
    () => ({
      networkId: (chain ?? evmNetwork)?.id,
      networkName: formatNetworkName(chain, evmNetwork),
    }),
    [chain, evmNetwork, formatNetworkName]
  )
  return { networkId, networkName }
}
