import type { AddressEncoding } from "../../types"
import { LruCache } from "../../utils/lruCache"
import { isBase58CheckAddress, isBech32Address, isBech32mAddress } from "./bitcoin"
import { isEthereumAddress } from "./ethereum"
import { isSolanaAddress } from "./solana"
import { isSs58Address } from "./ss58"

// `null` records an unknown encoding, so an invalid string runs the decoders once.
// The longest supported address (bech32) is 90 characters.
const CACHE = new LruCache<AddressEncoding | null>(4096, 128)

const detectAddressEncodingInner = (address: string): AddressEncoding | null => {
  if (isEthereumAddress(address)) return "ethereum"
  if (isSs58Address(address)) return "ss58"
  if (isSolanaAddress(address)) return "base58solana"
  if (isBech32mAddress(address)) return "bech32m"
  if (isBech32Address(address)) return "bech32"
  if (isBase58CheckAddress(address)) return "base58check"
  return null
}

export const detectAddressEncoding = (address: string): AddressEncoding => {
  let encoding = CACHE.get(address)
  if (encoding === undefined) {
    encoding = detectAddressEncodingInner(address)
    CACHE.set(address, encoding)
  }
  if (encoding === null) throw new Error(`Unknown address encoding`)
  return encoding
}
