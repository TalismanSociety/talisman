import EventEmitter from "events"

export interface AnyEthRequest {
  readonly method: string
  readonly params?: readonly unknown[] | object
}

export interface EthProvider extends EventEmitter {
  request(args: AnyEthRequest): Promise<unknown>
}
