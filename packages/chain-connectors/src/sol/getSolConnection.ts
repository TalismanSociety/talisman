import { Connection } from "@solana/web3.js"
import { SolNetworkId } from "@talismn/chaindata-provider"

// TODO leverage multiple rpcs with fallback
export const getSolConnection = (networkId: SolNetworkId, rpcs: string[]) => {
  return new Connection(rpcs[0], {
    commitment: "confirmed",
  })
}
