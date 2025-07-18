import { normalizeAddress } from "./normalizeAddress"

export const isValidAddress = (address: string): boolean => {
  try {
    normalizeAddress(address)
    return true
  } catch {
    return false
  }
}
