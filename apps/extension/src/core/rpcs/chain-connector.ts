import { chaindataProvider } from "@core/rpcs/chaindata"
import { ChainConnector } from "@talismn/chain-connector"
import { connectionMetaDb } from "@talismn/connection-meta"

export const chainConnector = new ChainConnector(chaindataProvider, connectionMetaDb)

export type RequestRpcByGenesisHashSend = {
  genesisHash: string
  method: string
  params: unknown[]
}
export type RequestRpcByGenesisHashSubscribe = {
  genesisHash: string
  subscribeMethod: string
  unsubscribeMethod: string
  responseMethod: string
  params: unknown[]
  timeout: number | false
}
export type RequestRpcByGenesisHashUnsubscribe = {
  subscriptionId: string
}
