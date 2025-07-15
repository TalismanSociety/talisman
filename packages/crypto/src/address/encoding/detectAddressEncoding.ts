import type { AddressEncoding } from "../../types"
import { isBase58CheckAddress, isBech32Address, isBech32mAddress } from "./bitcoin"
import { isEthereumAddress } from "./ethereum"
import { isSolanaAddress } from "./solana"
import { isSs58Address } from "./ss58"

const CACHE = new Map<string, AddressEncoding>()

const detectAddressEncodingInner = (address: string): AddressEncoding => {
  if (isEthereumAddress(address)) return "ethereum"
  if (isSs58Address(address)) return "ss58"
  if (isSolanaAddress(address)) return "base58solana"
  if (isBech32mAddress(address)) return "bech32m"
  if (isBech32Address(address)) return "bech32"
  if (isBase58CheckAddress(address)) return "base58check"

  throw new Error(`Unknown address encoding`)
}
export const detectAddressEncoding = (address: string): AddressEncoding => {
  if (!CACHE.has(address)) CACHE.set(address, detectAddressEncodingInner(address))
  return CACHE.get(address)!
}
