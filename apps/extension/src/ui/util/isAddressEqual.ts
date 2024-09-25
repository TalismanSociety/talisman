import { normalizeAddress } from "./normalizeAddress"

export const isAddressEqual = (address1: string, address2: string) => {
  return normalizeAddress(address1) === normalizeAddress(address2)
}
