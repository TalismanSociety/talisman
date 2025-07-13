import { bind } from "@react-rxjs/core"
import { DotNetwork, Network, NetworkId, NetworkList } from "@talismn/chaindata-provider"
import { TFunction } from "i18next"
import { groupBy, toPairs } from "lodash-es"
import { combineLatest, map, of } from "rxjs"

import { getNetworks$, getNetworksMapById$ } from "./chaindata"
import { t$ } from "./i18n"

const getDotNetworkType = (network: DotNetwork, networksById: NetworkList, t: TFunction) => {
  switch (network.topology.type) {
    case "standalone":
      return t("Polkadot-SDK")
    case "relay":
      return t("Relay Chain")
    case "parachain": {
      const relay = networksById[network.topology.relayId]
      return relay?.name ? t("{{name}} Parachain", { name: relay.name }) : t("Parachain")
    }
  }
}

const getNetworksWithDuplicateNames = (networks: Network[]) => {
  const networksGroupedByName = groupBy(networks, (network) => network.name.trim().toLowerCase())
  return toPairs(networksGroupedByName)
    .filter(([, entries]) => entries.length > 1)
    .flatMap(([, entries]) => entries.map((network) => network.id))
}

export const [useNetworkDisplayNamesMapById, networkDisplayNamesMapById$] = bind(
  combineLatest([getNetworks$(), getNetworksMapById$(), t$]).pipe(
    map(([networks, networksById, t]): Record<NetworkId, string | null> => {
      const networksWithDuplicateNames = getNetworksWithDuplicateNames(networks)

      return Object.fromEntries(
        networks.map((network) => {
          if (!networksWithDuplicateNames.includes(network.id)) return [network.id, network.name] // no collision, use name as is

          // use name that describes the network type
          switch (network.platform) {
            case "ethereum":
              return [network.id, `${network.name} (${t("Ethereum")})`]
            case "polkadot": {
              const dotNetwork = network as DotNetwork
              const type = getDotNetworkType(dotNetwork, networksById, t)
              return [network.id, `${network.name} (${type})`]
            }
          }
        }),
      )
    }),
  ),
)

export const [useNetworkDisplayName, networkDisplayName$] = bind(
  (networkId: NetworkId | null | undefined) => {
    if (!networkId) return of(null)
    return networkDisplayNamesMapById$.pipe(map((map) => map[networkId] ?? null))
  },
)
