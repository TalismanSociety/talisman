import { detectAddressEncoding } from "./encoding"

export const isAddressValid = (address: string): boolean => {
  try {
    detectAddressEncoding(address)
    return true
  } catch {
    return false
  }
}
