import { normalizeAddress } from "./normalizeAddress"

export const isAddressEqual = (address1: string, address2: string) => {
  try {
    return normalizeAddress(address1) === normalizeAddress(address2)
  } catch (err) {
    // if normalization fails, assume the addresses are not equal
    return false
  }
}
