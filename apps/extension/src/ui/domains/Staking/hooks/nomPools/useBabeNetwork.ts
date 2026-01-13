import type { NetworkId } from "@talismn/chaindata-provider"
import { useNetworksMapById } from "@ui/state"
import { useMemo } from "react"

/**
 *
 * @param networkId
 * @returns the network on which the era duration should be queried (if staking is done on a parachain, it should be its relay chain)
 */
export const useBabeNetwork = (networkId: NetworkId | null | undefined) => {
  const networks = useNetworksMapById({ platform: "polkadot" })

  return useMemo(() => {
    const network = networks[networkId ?? ""]
    // for parachains, babe is found on the associated relay chain
    if (network?.topology.type === "parachain") return networks[network.topology.relayId] ?? null
    return network ?? null
  }, [networkId, networks])
}
