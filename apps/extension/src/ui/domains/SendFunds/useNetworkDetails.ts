import { Chain, CustomChain, CustomEvmNetwork, EvmNetwork } from "@talismn/chaindata-provider"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSendFunds } from "./useSendFunds"

/**
 * Returns a function that formats a network name for display.
 * @returns A function that formats a network name for display.
 * @description
 * For networks which have both a Substrate and Ethereum chain, the network name will be formatted as:
 *   Network Name (Substrate) or Network Name (Ethereum)
 *
 * For networks which have only a Substrate or Ethereum chain, the network name will be formatted as:
 *   Network Name
 **/
export const useFormatNetworkName = () => {
  const [t] = useTranslation()

  return useCallback(
    (chain?: Chain | CustomChain | null, evmNetwork?: EvmNetwork | CustomEvmNetwork | null) =>
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
