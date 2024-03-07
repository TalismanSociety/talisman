import { getEthAddress, getSubAddress, isEthAddress } from "./lib"

export const normalizeAddress = (address: string) => {
  return isEthAddress(address) ? getEthAddress(address) : getSubAddress(address)
}
