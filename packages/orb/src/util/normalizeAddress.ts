import { isEthAddress, normalizeEthAddress, normalizeSubAddress } from "./lib"

export const normalizeAddress = (address: string) => {
  return isEthAddress(address) ? normalizeEthAddress(address) : normalizeSubAddress(address)
}
