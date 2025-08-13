import { bind } from "@react-rxjs/core"
import { DotNetwork, Network, NetworkId, NetworkList } from "@talismn/chaindata-provider"
import { TFunction } from "i18next"
import { fromPairs, groupBy, toPairs } from "lodash-es"
import { combineLatest, map, of } from "rxjs"

import { getNetworks$, getNetworksMapById$ } from "./chaindata"
import { t$ } from "./i18n"

const getDotNetworkType = (network: DotNetwork, networksById: NetworkList, t: TFunction) => {
  switch (network.topology.type) {
    case "standalone":
      return t("Polkadot-SDK Blockchain")
    case "relay":
      return t("Relay Chain")
    case "parachain": {
      const relay = networksById[network.topology.relayId]
      return relay?.name ? t("{{name}} Parachain", { name: relay.name }) : t("Parachain")
    }
  }
}

export const [useNetworkDisplayTypesMapById, networkDisplayTypesMapById$] = bind(
  combineLatest([getNetworks$(), getNetworksMapById$(), t$]).pipe(
    map(([networks, networksById, t]): Record<NetworkId, string | null> => {
      return fromPairs(
        networks.map((network) => {
          // use name that describes the network type
          switch (network.platform) {
            case "ethereum":
              return [network.id, t("Ethereum Blockchain")]
            case "polkadot": {
              const dotNetwork = network as DotNetwork
              return [network.id, getDotNetworkType(dotNetwork, networksById, t)]
            }
            case "solana":
              return [network.id, t("Solana Blockchain")]
          }
        }),
      )
    }),
  ),
)

export const [useNetworkDisplayType, networkDisplayType$] = bind(
  (networkId: NetworkId | null | undefined) => {
    if (!networkId) return of(null)
    return networkDisplayTypesMapById$.pipe(map((map) => map[networkId] ?? null))
  },
)

const getNetworksWithDuplicateNames = (networks: Network[]) => {
  const networksGroupedByName = groupBy(networks, (network) => network.name.trim().toLowerCase())
  return toPairs(networksGroupedByName)
    .filter(([, entries]) => entries.length > 1)
    .flatMap(([, entries]) => entries.map((network) => network.id))
}

export const [useNetworkDisplayNamesMapById, networkDisplayNamesMapById$] = bind(
  combineLatest([getNetworks$(), networkDisplayTypesMapById$]).pipe(
    map(([networks, networksTypesById]): Record<NetworkId, string | null> => {
      const networksWithDuplicateNames = getNetworksWithDuplicateNames(networks)

      return fromPairs(
        networks.map((network) => {
          const name = networksWithDuplicateNames.includes(network.id)
            ? `${network.name} (${networksTypesById[network.id]})`
            : network.name
          return [network.id, name]
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
