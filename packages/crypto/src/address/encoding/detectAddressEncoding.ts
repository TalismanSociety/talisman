import type { AddressEncoding } from "../../types"
import { isBase58Address } from "./base58"
import { isEthereumAddress } from "./ethereum"
import { isSs58Address } from "./ss58"

const CACHE = new Map<string, AddressEncoding>()

const detectAddressEncodingInner = (address: string): AddressEncoding => {
  if (isEthereumAddress(address)) return "ethereum"
  if (isSs58Address(address)) return "ss58"
  if (isBase58Address(address)) return "base58"

  throw new Error(`Unknown address encoding`)
}
export const detectAddressEncoding = (address: string): AddressEncoding => {
  if (!CACHE.has(address)) CACHE.set(address, detectAddressEncodingInner(address))
  return CACHE.get(address)!
}
