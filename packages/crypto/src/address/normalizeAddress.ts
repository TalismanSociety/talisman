import {
  checksumEthereumAddress,
  decodeSs58Address,
  detectAddressEncoding,
  encodeAddressSs58,
} from "./encoding"

const CACHE = new Map<string, string>()

// Normalize an address in a way that it can be compared to other addresses that have also been normalized
export const normalizeAddress = (address: string) => {
  try {
    if (!CACHE.has(address)) CACHE.set(address, normalizeAnyAddress(address))
    return CACHE.get(address)!
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
