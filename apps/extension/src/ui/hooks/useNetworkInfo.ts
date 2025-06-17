import { DotNetwork, Network, NetworkId, NetworkList } from "extension-core"
import { TFunction } from "i18next"
import { isArray, keyBy } from "lodash"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useNetworks } from "@ui/state"

export type NetworkInfoProps = {
  networkId: NetworkId | null | undefined
  networks: Network[] | NetworkList
}

const getDotNetworkType = (t: TFunction, network: DotNetwork, networks: NetworkList) => {
  if (network.isTestnet) return t("Testnet")

  switch (network.topologyInfo.type) {
    case "standalone":
      return t("Blockchain")
    case "relay":
      return t("Relay Chain")
    case "parachain": {
      const relay = networks[network.topologyInfo.relayId]
      return relay?.name ? t("{{name}} Parachain", { name: relay.name }) : t("Parachain")
    }
  }
}

export const getNetworkInfo = (t: TFunction, { networkId, networks }: NetworkInfoProps) => {
  const networksMap = isArray(networks) ? keyBy(networks, "id") : networks
  const network = networksMap[networkId ?? ""]

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
      const type = getDotNetworkType(t, network, networksMap)
      return {
        label: network.name,
        type: type,
        fullName:
          network.topologyInfo.type !== "standalone" ? `${network.name} (${type})` : network.name,
      }
    }
  }
}

export const useNetworkInfo = (networkId: NetworkId | null | undefined) => {
  const networks = useNetworks()
  const { t } = useTranslation()

  return useMemo(() => getNetworkInfo(t, { networkId, networks }), [networkId, networks, t])
}
