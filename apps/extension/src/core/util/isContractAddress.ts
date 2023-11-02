import { EvmAddress } from "@core/domains/ethereum/types"
import { PublicClient } from "viem"

export const isContractAddress = async (client: PublicClient, address: EvmAddress) => {
  try {
    const code = await client.getBytecode({ address })
    return code !== "0x"
  } catch (error) {
    // not a contract
    return false
  }
}
