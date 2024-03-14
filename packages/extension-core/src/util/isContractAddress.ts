import { PublicClient } from "viem"

import { EvmAddress } from "../domains/ethereum/types"

export const isContractAddress = async (client: PublicClient, address: EvmAddress) => {
  try {
    const code = await client.getBytecode({ address })
    return !!code && code !== "0x"
  } catch (error) {
    // not a contract
    return false
  }
}
