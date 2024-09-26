import { encodeAnyAddress } from "@talismn/util"
import { log } from "extension-shared"

const CACHE = new Map<string, string>()

// Normalize an address in a way that it can be compared to other addresses that have also been normalized
export const normalizeAddress = (address: string) => {
  try {
    if (!CACHE.has(address)) CACHE.set(address, encodeAnyAddress(address, 42))
    return CACHE.get(address)!
  } catch (err) {
    log.error("Failed to normalize address", { err, address })
    return address
  }
}
