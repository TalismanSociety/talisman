import { getLookupFn } from "@polkadot-api/metadata-builders"

import log from "../log"
import type { Chain } from "./types"

export const hasEvent = (chain: Chain, pallet: string, event: string): boolean => {
  try {
    const palletDef = chain.metadata.pallets.find((p) => p.name === pallet)
    if (typeof palletDef?.events !== "number") return false

    const lookup = getLookupFn(chain.metadata)
    const palletEvents = lookup(palletDef.events)

    return palletEvents.type === "enum" && event in palletEvents.innerDocs
  } catch (err) {
    log.error("Failed to check event existence", { pallet, event, err })
    return false
  }
}
