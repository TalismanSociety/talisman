import { Chain, ChainId, ChainList } from "@talismn/chaindata-provider"
export type { Chain, ChainId, ChainList, SubstrateRpc } from "@talismn/chaindata-provider"

export interface ChainsMessages {
  // chain message signatures
  "pri(chains.subscribe)": [null, boolean, boolean]
}
