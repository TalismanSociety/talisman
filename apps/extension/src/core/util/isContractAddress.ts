import { EvmAddress } from "@core/domains/ethereum/types"
import { ethers } from "ethers"
import { PublicClient } from "viem"

/** @deprecated */
export const isContractAddressOld = async (
  provider: ethers.providers.Provider,
  address: string
) => {
  try {
    const code = await provider.getCode(address)
    return code !== "0x"
  } catch (error) {
    // not a contract
    return false
  }
}

export const isContractAddress = async (client: PublicClient, address: EvmAddress) => {
  try {
    const code = await client.getBytecode({ address })
    // TODO remove log
    // eslint-disable-next-line no-console
    console.log("isContractAddress remove after checking", { code })
    return code !== "0x"
  } catch (error) {
    // not a contract
    return false
  }
}
