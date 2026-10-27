import { LruCache } from "../utils/lruCache"
import {
  checksumEthereumAddress,
  decodeSs58Address,
  detectAddressEncoding,
  encodeAddressSs58,
} from "./encoding"

const CACHE = new LruCache<string>(4096, 128)

// Normalize an address in a way that it can be compared to other addresses that have also been normalized
export const normalizeAddress = (address: string) => {
  try {
    let normalized = CACHE.get(address)
    if (normalized === undefined) {
      normalized = normalizeAnyAddress(address)
      CACHE.set(address, normalized)
    }
    return normalized
  } catch (cause) {
    throw new Error(`Unable to normalize address: ${address}`, { cause })
  }
}

const normalizeAnyAddress = (address: string) => {
  switch (detectAddressEncoding(address)) {
    case "ethereum":
      return checksumEthereumAddress(address)
    case "bech32m":
    case "bech32":
    case "base58check":
    case "base58solana":
      return address
    case "ss58": {
      const [pk] = decodeSs58Address(address)
      return encodeAddressSs58(pk, 42)
    }
  }
}
