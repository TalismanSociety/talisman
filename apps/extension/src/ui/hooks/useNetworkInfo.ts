import { DotNetwork, NetworkId, NetworkList } from "@talismn/chaindata-provider"
import { TFunction } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useNetworksMapById } from "@ui/state"

export type NetworkInfoProps = {
  networkId: NetworkId | null | undefined
  networks: NetworkList
}

const getDotNetworkType = (t: TFunction, network: DotNetwork, networks: NetworkList) => {
  if (network.isTestnet) return t("Testnet")

  switch (network.topology.type) {
    case "standalone":
      return t("Blockchain")
    case "relay":
      return t("Relay Chain")
    case "parachain": {
      const relay = networks[network.topology.relayId]
      return relay?.name ? t("{{name}} Parachain", { name: relay.name }) : t("Parachain")
    }
  }
}

export const getNetworkInfo = (t: TFunction, { networkId, networks }: NetworkInfoProps) => {
  const network = networks[networkId ?? ""]

  // TODO adjust so we can return undefined instead
  if (!network) return { label: "", type: "", fullName: "" }

  switch (network.platform) {
    case "ethereum":
      return {
        label: network.name,
        type: network.isTestnet ? t("EVM Testnet") : t("EVM Blockchain"),
        fullName: network.substrateChainId ? `${network.name} (${t("Ethereum")})` : network.name,
      }
    case "polkadot": {
      const type = getDotNetworkType(t, network, networks)
      return {
        label: network.name,
        type: type,
        fullName:
          network.topology.type !== "standalone" ? `${network.name} (${type})` : network.name,
      }
    }
  }
}

export const useNetworkInfo = (networkId: NetworkId | null | undefined) => {
  const networks = useNetworksMapById()
  const { t } = useTranslation()

  return useMemo(() => getNetworkInfo(t, { networkId, networks }), [networkId, networks, t])
}
