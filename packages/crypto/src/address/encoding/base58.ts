import { base58 } from "@scure/base"

export const encodeAddressBase58 = (publicKey: Uint8Array): string => {
  return base58.encode(publicKey)
}

export function isBase58Address(address: string): boolean {
  try {
    base58.decode(address)
    return true // note that it will return true for a ss58 address too
  } catch (error) {
    return false
  }
}
