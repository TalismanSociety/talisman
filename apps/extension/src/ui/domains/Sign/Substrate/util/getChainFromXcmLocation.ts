import { HydrationXcmVersionedLocation, XcmVersionedLocation } from "@polkadot-api/descriptors"
import { DotNetwork } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

const getParachain = (chain: DotNetwork, paraId: number, chains: DotNetwork[]): DotNetwork => {
  switch (chain.topology.type) {
    case "relay": {
      const parachain = chains.find(
        (c) =>
          c.topology.type === "parachain" &&
          c.topology.paraId === paraId &&
          c.topology.relayId === chain.id,
      )
      if (!parachain) throw new Error("Unknown parachain")
      return parachain
    }
    case "parachain": {
      const relayId = chain.topology.relayId
      const parachain = chains.find(
        (c) =>
          c.topology.type === "parachain" &&
          c.topology.paraId === paraId &&
          c.topology.relayId === relayId,
      )
      if (!parachain) throw new Error("Unknown parachain")

      return parachain
    }
    default:
      throw new Error("Cannot find parachain standalone chain")
  }
}

const getRelay = (chain: DotNetwork, chains: DotNetwork[]): DotNetwork => {
  switch (chain.topology.type) {
    case "parachain": {
      const relayId = chain.topology.relayId
      const relay = chains.find((c) => c.id === relayId)
      if (!relay) throw new Error("Unknown relay")
      return relay
    }
    default:
      throw new Error("Cannot find relay for non-parachain")
  }
}

export const getChainFromXcmLocation = (
  multiLocation: XcmVersionedLocation | HydrationXcmVersionedLocation,
  chain: DotNetwork,
  chains: DotNetwork[],
): DotNetwork => {
  try {
    if (multiLocation.value.parents === 2) throw new Error("Unknown consensus")

    const interior = multiLocation.value.interior
    if (interior.type === "Here") {
      if (multiLocation.value.parents === 1) {
        return getRelay(chain, chains)
      }

      return chain
    }

    if (interior.type === "X1") {
      if (interior.value.type === "Parachain")
        return getParachain(chain, interior.value.value, chains)

      return chain // assume location targets something on current chain
    }

    const parachain = interior.value.find((i) => i.type === "Parachain")
    if (parachain?.type === "Parachain") return getParachain(chain, parachain.value, chains)

    return chain // assume location targets something on current chain
  } catch (err) {
    log.debug("getChainFromXcmLocation", { multiLocation, chain, chains, err })
    throw err
  }
}
