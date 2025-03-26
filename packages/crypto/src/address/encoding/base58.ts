import { base58 } from "@scure/base"

export const encodeAddressBase58 = (publicKey: Uint8Array): string => {
  return base58.encode(publicKey)
}
/** Detect if address is base58 encoded (NOTE: also returns true for ss58 addresses) */
export function isBase58Address(address: string): boolean {
  try {
    base58.decode(address)
    return true
  } catch (error) {
    return false
  }
}
