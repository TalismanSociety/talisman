import type { PublicClient } from "viem"

import type { EvmAddress } from "../domains/ethereum/types"

export const isContractAddress = async (client: PublicClient, address: EvmAddress) => {
  try {
    const code = await client.getBytecode({ address })
    return !!code && code !== "0x"
  } catch {
    // not a contract
    return false
  }
}
