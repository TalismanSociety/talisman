import { encodeAnyAddress } from "@talismn/util"

const CACHE = new Map<string, string>()

// Normalize an address in a way that it can be compared to other addresses that have also been normalized
export const normalizeAddress = (address: string) => {
  if (!CACHE.has(address)) CACHE.set(address, encodeAnyAddress(address, 42))
  return CACHE.get(address)!
}
