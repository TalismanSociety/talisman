import { Connection } from "@solana/web3.js"
import { SolNetworkId } from "@talismn/chaindata-provider/src/chaindata/networks/SolNetwork"

import log from "./log"

export const getSolConnection = async (networkId: SolNetworkId, rpcs: string[]) => {
  // Try each RPC URL until one works
  for (const rpcUrl of rpcs) {
    try {
      const connection = new Connection(rpcUrl, "confirmed")
      // Test the connection with a lightweight call
      await connection.getSlot()
      return connection
    } catch (error) {
      log.warn(`Failed to connect to Solana RPC ${rpcUrl}:`, error)
      continue
    }
  }

  log.error(`All Solana RPC endpoints failed for network ${networkId}`)
  return null
}
