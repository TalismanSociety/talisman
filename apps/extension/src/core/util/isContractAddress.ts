import { ethers } from "ethers"

export const isContractAddress = async (provider: ethers.providers.Provider, address: string) => {
  try {
    const code = await provider.getCode(address)
    return code !== "0x"
  } catch (error) {
    // if it comes here, then it's not a contract.
    return false
  }
}
