import { XcmVersionedLocation } from "@polkadot-api/descriptors"
import { Chain } from "extension-core"
import { log } from "extension-shared"

const getParachain = (relayId: string, paraId: number, chains: Chain[]): Chain => {
  const targetChain = chains.find((c) => c.relay?.id === relayId && c.paraId === paraId)
  if (targetChain) return targetChain
  throw new Error("Unknown parachain")
}

export const getChainFromXcmLocation = (
  multiLocation: XcmVersionedLocation,
  chain: Chain,
  chains: Chain[],
): Chain => {
  try {
    const relayId = chain.relay ? chain.relay.id : chain.id

    if (multiLocation.value.parents === 2) throw new Error("Unknown consensus")

    const interior = multiLocation.value.interior
    if (interior.type === "Here") {
      if (multiLocation.value.parents === 1) {
        const relay = chains.find((c) => c.id === relayId)
        if (!relay) throw new Error("Unknown relay")
        return relay
      }

      return chain
    }

    if (interior.type === "X1") {
      if (interior.value.type === "Parachain")
        return getParachain(relayId, interior.value.value, chains)

      return chain // assume location targets something on current chain
    }

    const parachain = interior.value.find((i) => i.type === "Parachain")
    if (parachain) return getParachain(relayId, parachain.value, chains)

    return chain // assume location targets something on current chain
  } catch (err) {
    log.debug("getChainFromXcmLocation", { multiLocation, chain, chains, err })
    throw err
  }
}
