import type { BtcApi } from "@talismn/bitcoin"
import type { BtcNetworkId } from "@talismn/chaindata-provider"

export interface IChainConnectorBtc {
  getApi: (networkId: BtcNetworkId) => Promise<BtcApi>
}
