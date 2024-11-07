import { Chain } from "extension-core"
import { log } from "extension-shared"
import { XcmVersionedLocation } from "papi-descriptors"

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

    if (multiLocation.type === "V3") {
      const interior = multiLocation.value.interior
      if (interior.type === "Here") return chain

      if (interior.type === "X1") {
        if (interior.value.type === "Parachain")
          return getParachain(relayId, interior.value.value, chains)

        return chain // assume location targets an address on current chain
      }

      const parachain = interior.value.find((i) => i.type === "Parachain")
      if (parachain) return getParachain(relayId, parachain.value, chains)

      return chain // assume location targets an address on current chain
    }

    throw new Error("Unknown multi location")
  } catch (err) {
    log.debug("getChainFromXcmLocation", { multiLocation, chain, chains, err })
    throw err
  }
}
