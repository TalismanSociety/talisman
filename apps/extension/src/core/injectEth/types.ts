import EventEmitter from "events"

// export type EthSubscriptionId = string

// export interface EthSubscriptionData {
//   readonly subscription: EthSubscriptionId
//   readonly result: unknown
// }

// export interface EthSubscriptionMessage extends EthProviderMessage {
//   readonly type: "eth_subscription"
//   readonly data: EthSubscriptionData
// }

// export interface ProviderConnectInfo {
//   readonly chainId: string
// }

export interface AnyEthRequest {
  readonly method: string
  readonly params?: readonly unknown[] | object
}

export interface EthProvider extends EventEmitter {
  request(args: AnyEthRequest): Promise<unknown>
}
