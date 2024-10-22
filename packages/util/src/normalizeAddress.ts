import { encodeAnyAddress } from "./encodeAnyAddress"

const CACHE = new Map<string, string>()

// Normalize an address in a way that it can be compared to other addresses that have also been normalized
export const normalizeAddress = (address: string) => {
  try {
    if (!CACHE.has(address)) CACHE.set(address, encodeAnyAddress(address))
    return CACHE.get(address)!
  } catch (cause) {
    throw new Error(`Unable to normalize address: ${address}`, { cause })
  }
}
