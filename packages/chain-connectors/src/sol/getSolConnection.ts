import { Connection } from "@solana/web3.js"
import { SolNetworkId } from "@talismn/chaindata-provider"

// TODO
export const getSolConnection = (_networkId: SolNetworkId, _rpcs: string[]) => {
  return new Connection(
    "https://solana-mainnet.g.alchemy.com/v2/FlflUnY6iZ98J9likA0ZdLSMfa6SqMya",
    {
      commitment: "confirmed",
    },
  )
}
