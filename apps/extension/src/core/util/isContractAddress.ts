import { ethers } from "ethers"

export const isContractAddress = async (provider: ethers.providers.Provider, address: string) => {
  try {
    const code = await provider.getCode(address)
    return code !== "0x"
  } catch (error) {
    // not a contract
    return false
  }
}
